import type { ParsedArgs } from 'inquirerer';
import * as path from 'path';
import { Client } from 'pg';
import { getPgEnvOptions, type PgConfig } from 'pg-env';

import type { LoadConfigParams } from '../config/loader';
import type { ExtensionsConfig, RulesConfig, SafegresConfig } from '../config/types';

export function csvList(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Merge `--ignore-extensions` / `--audit-extension-owned` over the config's
 * `extensions` block. Returns `undefined` when neither side says anything, so
 * the introspection defaults apply.
 */
export function extensionScopeFromArgv(
  argv: ParsedArgs,
  config: SafegresConfig
): ExtensionsConfig | undefined {
  const ignore = csvList(argv['ignore-extensions']) ?? config.extensions?.ignore;
  const skipOwned = argv['audit-extension-owned'] === true ? false : config.extensions?.skipOwned;
  if (ignore === undefined && skipOwned === undefined) return undefined;
  return { ...(ignore !== undefined && { ignore }), ...(skipOwned !== undefined && { skipOwned }) };
}

export function buildClient(argv: ParsedArgs): Client {
  if (typeof argv.connection === 'string' && argv.connection.length > 0) {
    return new Client({ connectionString: argv.connection });
  }
  const overrides: Partial<PgConfig> = {};
  if (typeof argv.host === 'string') overrides.host = argv.host;
  if (typeof argv.port === 'number') overrides.port = argv.port;
  if (typeof argv.user === 'string') overrides.user = argv.user;
  if (typeof argv.password === 'string') overrides.password = argv.password;
  if (typeof argv.database === 'string') overrides.database = argv.database;
  return new Client(getPgEnvOptions(overrides));
}

/**
 * Parse repeatable `--rule CODE=SETTING` flags into a RulesConfig, e.g.
 * `--rule A3=off --rule A5=high --rule 'P*'=off`.
 */
export function parseRuleFlags(value: unknown): RulesConfig | undefined {
  if (value == null) return undefined;
  const entries = Array.isArray(value) ? value : [value];
  const rules: RulesConfig = {};
  for (const entry of entries) {
    if (typeof entry !== 'string') continue;
    const eq = entry.indexOf('=');
    if (eq <= 0) {
      throw new Error(`Invalid --rule "${entry}": expected CODE=off|<severity>.`);
    }
    const code = entry.slice(0, eq).trim();
    const setting = entry.slice(eq + 1).trim();
    rules[code] = setting as RulesConfig[string];
  }
  return Object.keys(rules).length > 0 ? rules : undefined;
}

/** Did the caller name a database on the command line, rather than in the environment? */
function hasConnectionFlag(argv: ParsedArgs): boolean {
  return ['connection', 'database', 'host', 'port'].some((flag) => typeof argv[flag] === 'string' || typeof argv[flag] === 'number');
}

/** Every file a run reads or writes, after flags and config have been merged. */
export interface RunPaths {
  /** The pgpm workspace to deploy, when `usePgpm`. Undefined means "nearest". */
  pgpm?: string;
  usePgpm: boolean;
  perfBaseline?: string;
  callGraphBaseline?: string;
  outputs: {
    json?: string;
    markdown?: string;
    sarif?: string;
    sarifSources?: string;
    snapshot?: string;
    githubComment?: string;
  };
}

/**
 * Flags win over the config file. A path from the config file is resolved
 * against that file, so a CI job can run from any directory; a path on the
 * command line stays relative to cwd, like every other command's arguments.
 */
export function resolveRunPaths(
  argv: ParsedArgs,
  config: SafegresConfig,
  configDir: string
): RunPaths {
  const pick = (flag: unknown, configured?: string): string | undefined =>
    typeof flag === 'string' ? flag : configured && path.resolve(configDir, configured);

  // A directory is the common case: one path, conventional names, no remembering
  // which extension goes with which renderer. A named file still wins.
  const dir = pick(argv.out, config.outputs?.dir);
  const inDir = (name: string): string | undefined => dir && path.join(dir, name);

  return {
    pgpm: pick(argv.pgpm, config.source?.pgpm),
    // An explicit connection on the command line beats a configured source:
    // pointing the same config at a database you already have is the whole
    // reason to type one, and deploying a throwaway copy instead would ignore it.
    usePgpm: argv.pgpm !== undefined || (config.source?.pgpm !== undefined && !hasConnectionFlag(argv)),
    perfBaseline: pick(argv['perf-baseline'], config.perf?.baseline),
    callGraphBaseline: pick(argv.baseline, config.callGraph?.baseline),
    outputs: {
      json: pick(argv['write-json'], config.outputs?.json) ?? inDir('safegres.json'),
      markdown: pick(argv['write-markdown'], config.outputs?.markdown) ?? inDir('safegres.md'),
      sarif: pick(argv['write-sarif'], config.outputs?.sarif) ?? inDir('safegres.sarif'),
      sarifSources: pick(argv['sarif-sources'], config.outputs?.sarifSources),
      snapshot: pick(argv['write-snapshot'], config.outputs?.snapshot),
      githubComment: pick(argv['write-github-comment'], config.outputs?.githubComment)
    }
  };
}

/** Build config-loading params from shared CLI flags. */
export function configParamsFromArgv(argv: ParsedArgs): LoadConfigParams {
  const cliRules = parseRuleFlags(argv.rule);
  const overrides: Partial<SafegresConfig> = {};
  if (cliRules) overrides.rules = cliRules;

  return {
    configFile: typeof argv.config === 'string' ? argv.config : undefined,
    preset: typeof argv.preset === 'string' ? argv.preset : undefined,
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    sealed: argv.sealed === true
  };
}
