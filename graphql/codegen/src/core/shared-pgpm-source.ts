/**
 * Shared ephemeral PGPM source lifecycle for multi-target generation.
 */
import { createHash } from 'node:crypto';

import { PgpmPackage } from '@pgpmjs/core';
import type { PgConfig } from 'pg-env';
import { pgCache } from 'pg-cache';
import { createEphemeralDb, type EphemeralDbResult } from 'pgsql-client';
import { deployPgpm } from 'pgsql-seed';

import type {
  DbConfig,
  GraphQLSDKConfigTarget,
  PgpmConfig,
} from '../types/config';
import { mergeConfig } from '../types/config';
import { throwIfAborted } from './cancellation';
import { resolvePgConfig } from './introspect';
import {
  resolvePathFrom,
  type GenerateProgressEvent,
} from './target-generation';

export interface SharedPgpmSource {
  key: string;
  description: string;
  ephemeralDb: EphemeralDbResult;
  deployed: boolean;
}

function getPgpmSourceKey(pgpm: PgpmConfig, cwd: string): string | null {
  if (pgpm.modulePath) return `module:${resolvePathFrom(cwd, pgpm.modulePath)}`;
  if (pgpm.workspacePath && pgpm.moduleName)
    return `workspace:${resolvePathFrom(cwd, pgpm.workspacePath)}:${pgpm.moduleName}`;
  return null;
}

function getSharedPgpmSourceKey(
  pgpm: PgpmConfig,
  cwd: string,
  pgConfig: PgConfig,
): string | null {
  const sourceKey = getPgpmSourceKey(pgpm, cwd);
  if (!sourceKey) return null;
  const connectionFingerprint = createHash('sha256')
    .update(
      JSON.stringify([
        pgConfig.host,
        pgConfig.port,
        pgConfig.user,
        pgConfig.password,
        pgConfig.database,
      ]),
    )
    .digest('hex');
  return `${sourceKey}:connection:${connectionFingerprint}`;
}

function getModulePathFromPgpm(pgpm: PgpmConfig, cwd: string): string {
  if (pgpm.modulePath) return resolvePathFrom(cwd, pgpm.modulePath)!;
  if (pgpm.workspacePath && pgpm.moduleName) {
    const workspace = new PgpmPackage(
      resolvePathFrom(cwd, pgpm.workspacePath)!,
    );
    const moduleProject = workspace.getModuleProject(pgpm.moduleName);
    const modulePath = moduleProject.getModulePath();
    if (!modulePath) {
      throw new Error(`Module "${pgpm.moduleName}" not found in workspace`);
    }
    return modulePath;
  }
  throw new Error(
    'Invalid PGPM config: requires modulePath or workspacePath+moduleName',
  );
}

export async function prepareSharedPgpmSources(
  configs: Record<string, GraphQLSDKConfigTarget>,
  cliOverrides: Partial<GraphQLSDKConfigTarget> | undefined,
  cwd: string,
  env: Readonly<Record<string, string | undefined>>,
  onProgress?: (event: GenerateProgressEvent) => void,
  signal?: AbortSignal,
): Promise<Map<string, SharedPgpmSource>> {
  const sharedSources = new Map<string, SharedPgpmSource>();
  const pgpmTargets = new Map<
    string,
    {
      count: number;
      pgpm: PgpmConfig;
      baseConfig: PgConfig;
      description: string;
    }
  >();

  throwIfAborted(signal);

  for (const name of Object.keys(configs)) {
    throwIfAborted(signal);
    const merged = mergeConfig(configs[name], cliOverrides ?? {});
    const pgpm = merged.db?.pgpm;
    if (!pgpm) continue;
    const baseConfig = resolvePgConfig(merged.db?.config, env);
    const key = getSharedPgpmSourceKey(pgpm, cwd, baseConfig);
    if (!key) continue;
    const existing = pgpmTargets.get(key);
    pgpmTargets.set(key, {
      count: (existing?.count ?? 0) + 1,
      pgpm,
      baseConfig,
      description: getPgpmSourceKey(pgpm, cwd)!,
    });
  }

  try {
    for (const [key, target] of pgpmTargets) {
      throwIfAborted(signal);
      if (target.count < 2) continue;

      throwIfAborted(signal);
      const ephemeralDb = createEphemeralDb({
        prefix: 'codegen_pgpm_shared_',
        verbose: false,
        baseConfig: target.baseConfig,
      });
      const shared: SharedPgpmSource = {
        key,
        description: target.description,
        ephemeralDb,
        deployed: false,
      };
      sharedSources.set(key, shared);

      throwIfAborted(signal);
      const modulePath = getModulePathFromPgpm(target.pgpm, cwd);
      await deployPgpm(ephemeralDb.config, modulePath, false);
      shared.deployed = true;
      throwIfAborted(signal);

      const event: GenerateProgressEvent = {
        phase: 'pgpm.prepare',
        message: `[multi-target] Shared PGPM source deployed once for ${target.count} targets: ${target.description}`,
      };
      if (onProgress) onProgress(event);
      else console.log(event.message);
    }
  } catch (error) {
    try {
      for (const shared of sharedSources.values()) {
        pgCache.delete(shared.ephemeralDb.config.database);
      }
      await pgCache.waitForDisposals();
    } finally {
      for (const shared of sharedSources.values()) {
        shared.ephemeralDb.teardown({ keepDb: false });
      }
    }
    throw error;
  }

  return sharedSources;
}

export function applySharedPgpmDb(
  config: GraphQLSDKConfigTarget,
  sharedSources: Map<string, SharedPgpmSource>,
  cwd: string,
  env: Readonly<Record<string, string | undefined>>,
): GraphQLSDKConfigTarget {
  const pgpm = config.db?.pgpm;
  if (!pgpm) return config;

  const key = getSharedPgpmSourceKey(
    pgpm,
    cwd,
    resolvePgConfig(config.db?.config, env),
  );
  if (!key) return config;

  const shared = sharedSources.get(key);
  if (!shared) return config;

  const sharedDbConfig: DbConfig = {
    ...config.db,
    pgpm: undefined,
    config: shared.ephemeralDb.config,
    keepDb: true,
  };

  return {
    ...config,
    db: sharedDbConfig,
  };
}

export async function disposeSharedPgpmSources(
  sharedSources: Map<string, SharedPgpmSource>,
  keepDb: boolean,
): Promise<void> {
  for (const shared of sharedSources.values()) {
    try {
      // deployPgpm() caches connections that must be closed before dropping.
      pgCache.delete(shared.ephemeralDb.config.database);
      await pgCache.waitForDisposals();
    } finally {
      shared.ephemeralDb.teardown({ keepDb });
    }
  }
}
