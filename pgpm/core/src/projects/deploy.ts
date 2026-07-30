import { getEnvOptions } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import { errors, PgpmOptions } from '@pgpmjs/types';
import {resolve } from 'path';
import * as path from 'path';
import { getPgPool } from 'pg-cache';
import {PgConfig } from 'pg-env';

import { resolveEffectiveModulePath } from '../apply/materialize';
import { hasApplySpec } from '../apply/apply-spec';
import { deployModuleFast, isBundledDeployResult } from '../bundle/deploy-bundled';
import { PgpmPackage } from '../core/class/pgpm';
import { PgpmMigrate } from '../migrate/client';
import { resolveExtensionDependencies } from '../resolution/deps';

interface Extensions {
  resolved: string[];
  external: string[];
}

const log = new Logger('deploy');

export const deployProject = async (
  opts: PgpmOptions,
  name: string,
  database: string,
  pkg: PgpmPackage,
  toChange?: string
): Promise<Extensions> => {
  const mergedOpts = getEnvOptions(opts);
  log.info(`🔍 Gathering modules from ${pkg.workspacePath}...`);
  const modules = pkg.getModuleMap();

  if (!modules[name]) {
    log.error(`❌ Module "${name}" not found in modules list.`);
    throw errors.MODULE_NOT_FOUND({ name });
  }

  const modulePath = path.resolve(pkg.workspacePath!, modules[name].path);

  log.info(`📦 Resolving dependencies for ${name}...`);
  // Proxy (apply-spec) modules have no pgpm.plan, so resolve straight off the
  // workspace module map instead of instantiating a module-rooted package.
  const extensions: Extensions = hasApplySpec(modulePath)
    ? resolveExtensionDependencies(name, modules)
    : new PgpmPackage(modulePath, { extensionsDir: pkg.extensionsDir }).getModuleExtensions();

  const pgPool = getPgPool({ ...opts.pg, database });

  log.success(`🚀 Starting deployment to database ${database}...`);

  for (const extension of extensions.resolved) {
    try {
      if (extensions.external.includes(extension)) {
        const msg = `CREATE EXTENSION IF NOT EXISTS "${extension}" CASCADE;`;
        log.info(`📥 Installing external extension: ${extension}`);
        log.debug(`> ${msg}`);
        await pgPool.query(msg);
      } else {
        const sourcePath = resolve(pkg.workspacePath!, modules[extension].path);
        const modulePath = await resolveEffectiveModulePath(
          extension,
          sourcePath,
          modules,
          pkg.workspacePath!
        );
        log.info(`📂 Deploying local module: ${extension}`);
        log.debug(`→ Path: ${modulePath}`);
        if (modulePath !== sourcePath) {
          log.info(`🔁 Applying transpiled module (spec in ${sourcePath})`);
        }

        // The fast strategy is opt-in; everything else uses the per-change path.
        if (mergedOpts.deployment.fast || mergedOpts.deployment.bundled) {
          // Fast strategy: execute the module in one shot AND record the
          // migration ledger, from the pre-built bundle artifact when one
          // verifies and from `deploy/` otherwise. If the semantics cannot be
          // honoured, fall through to the per-change migration path rather than
          // deploying without a ledger.
          const outcome = await deployModuleFast(modulePath, {
            config: { ...(mergedOpts.pg as PgConfig), database },
            logOnly: mergedOpts.deployment.logOnly,
            useTransaction: mergedOpts.deployment.useTx,
            hashMethod: mergedOpts.deployment.hashMethod
          });
          if (isBundledDeployResult(outcome)) {
            continue;
          }
          log.info(`↩️ Fast deploy unavailable for ${extension} (${outcome}); using per-change path.`);
        }

        {
          // Use new migration system
          log.debug(`→ Command: constructive migrate deploy db:pg:${database}`);
          
          try {
            const client = new PgpmMigrate(mergedOpts.pg as PgConfig);
            
            const result = await client.deploy({
              modulePath,
              toChange,
              useTransaction: mergedOpts.deployment.useTx,
              logOnly: mergedOpts.deployment.logOnly
            });
            
            if (result.failed) {
              throw errors.OPERATION_FAILED({ operation: 'Deployment', target: result.failed });
            }
          } catch (deployError) {
            log.error(`❌ Deployment failed for module ${extension}`);
            console.error(deployError);
            throw errors.DEPLOYMENT_FAILED({ type: 'Deployment', module: extension });
          }
        }
      }
    } catch (err) {
      log.error(`🛑 Error during deployment: ${err instanceof Error ? err.message : err}`);
      console.error(err); // Keep raw error output for stack traces
      throw errors.DEPLOYMENT_FAILED({ type: 'Deployment', module: extension });
    }
  }

  log.success(`✅ Deployment complete for ${name}.`);
  return extensions;
};
