/**
 * Public code generation facade.
 *
 * Single-target planning lives in target-generation; multi-target ownership,
 * shared PGPM sources, and coordinated application live in multi-generation.
 */
import * as fs from 'node:fs';
import path from 'node:path';

import type { GraphQLSDKConfigTarget } from '../types/config';
import {
  applyGenerationJobs,
  completePreparedGeneration,
  failPreparedGeneration,
  type GenerateOptions,
  type GenerateResult,
  planTargetGeneration,
  resolvePathFrom,
} from './target-generation';

export type {
  GenerateMultiOptions,
  GenerateMultiResult,
} from './multi-generation';
export {
  generateMulti,
  removeStaleTargetDirs,
  TARGETS_MANIFEST,
} from './multi-generation';
export type {
  GenerateOptions,
  GenerateProgressEvent,
  GenerateResult,
} from './target-generation';

/** Generate one target and apply its complete filesystem plan atomically. */
export async function generate(
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const preparation = await planTargetGeneration(options);
  if (preparation.ok === false) return preparation.result;

  const batch = await applyGenerationJobs(
    preparation.prepared.writeJobs,
    options,
  );
  if (!batch.success) {
    const errors = batch.errors ?? ['Failed to apply generated files.'];
    return failPreparedGeneration(
      preparation.prepared,
      `Failed to ${options.dryRun ? 'plan' : 'write'} generated files: ${errors.join(', ')}`,
      batch.results,
      errors,
    );
  }
  return completePreparedGeneration(
    preparation.prepared,
    options.dryRun === true,
    batch.results,
  );
}

export function expandApiNamesToMultiTarget(
  config: GraphQLSDKConfigTarget,
): Record<string, GraphQLSDKConfigTarget> | null {
  const apiNames = config.db?.apiNames;
  if (!apiNames || apiNames.length <= 1) return null;

  const targets: Record<string, GraphQLSDKConfigTarget> = {};
  for (const apiName of apiNames) {
    targets[apiName] = {
      ...config,
      db: {
        ...config.db,
        apiNames: [apiName],
      },
      output: config.output
        ? `${config.output}/${apiName}`
        : `./generated/graphql/${apiName}`,
    };
  }
  return targets;
}

export function expandSchemaDirToMultiTarget(
  config: GraphQLSDKConfigTarget,
  cwd: string = process.cwd(),
): Record<string, GraphQLSDKConfigTarget> | null {
  const schemaDir = config.schemaDir;
  if (!schemaDir) return null;

  const resolvedDir = resolvePathFrom(path.resolve(cwd), schemaDir)!;
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    return null;
  }

  const graphqlFiles = fs
    .readdirSync(resolvedDir)
    .filter((file) => file.endsWith('.graphql'))
    .sort();

  if (graphqlFiles.length === 0) return null;

  const targets: Record<string, GraphQLSDKConfigTarget> = {};
  for (const file of graphqlFiles) {
    const name = path.basename(file, '.graphql');
    targets[name] = {
      ...config,
      schemaDir: undefined,
      schemaFile: path.join(resolvedDir, file),
      output: config.output
        ? `${config.output}/${name}`
        : `./generated/graphql/${name}`,
    };
  }
  return targets;
}
