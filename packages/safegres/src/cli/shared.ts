import type { ParsedArgs } from 'inquirerer';
import { Client } from 'pg';
import { getPgEnvOptions, type PgConfig } from 'pg-env';

import type { LoadConfigParams } from '../config/loader';
import type { RulesConfig, SafegresConfig } from '../config/types';

export function csvList(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
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

/** Build config-loading params from shared CLI flags. */
export function configParamsFromArgv(argv: ParsedArgs): LoadConfigParams {
  const cliRules = parseRuleFlags(argv.rule);
  const overrides: Partial<SafegresConfig> = {};
  if (cliRules) overrides.rules = cliRules;

  return {
    configFile: typeof argv.config === 'string' ? argv.config : undefined,
    preset: typeof argv.preset === 'string' ? argv.preset : undefined,
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined
  };
}
