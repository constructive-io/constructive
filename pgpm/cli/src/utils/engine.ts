import { resolve } from 'node:path';

import { getEnvOptions } from '@pgpmjs/env';
import {
  BUILTIN_ENGINES,
  DEFAULT_ENGINE,
  PgpmDriverCapabilities,
  PgpmDriverConfig,
  PgpmDriverSession,
  PgpmEngineConfig,
  PgpmOptions,
} from '@pgpmjs/types';

import { activateDriver, driverOverrideFromArgv, PGLITE_DRIVER_PLUGIN } from './driver';

/** Everything a real Postgres server can do — the built-in `pg` engine. */
export const SERVER_CAPABILITIES: PgpmDriverCapabilities = {
  createdb: true,
  dump: true,
  serverLifecycle: true,
  multiConnection: true,
};

/** The engine/driver selectors every command accepts. */
export interface EngineArgv {
  engine?: string;
  driver?: string;
  pglite?: boolean | string;
}

/** The engine a command runs against, plus the driver plugin backing it. */
export interface ResolvedEngine {
  /** Engine name, for messages: a registered name or a plugin package. */
  name: string;
  /** Driver plugin to activate; undefined = built-in `pg` (server) path. */
  driver?: PgpmDriverConfig;
}

/**
 * The engines available by name: the built-ins, overridden/extended by the
 * `engines` block of `pgpm.json` (sqitch's `[engine "name"]` sections).
 *
 * A configured entry is merged over its built-in, so declaring only options
 * (e.g. `engines.pglite.options.dataDir`) keeps the built-in plugin.
 */
export const engineDefinitions = (config: PgpmOptions): Record<string, PgpmEngineConfig> => {
  const definitions: Record<string, PgpmEngineConfig> = { ...BUILTIN_ENGINES };
  for (const [name, configured] of Object.entries(config.engines ?? {})) {
    definitions[name] = { ...definitions[name], ...configured };
  }
  return definitions;
};

const definitionToDriver = (
  definition: PgpmEngineConfig,
  options?: Record<string, unknown>
): PgpmDriverConfig | undefined =>
  definition.plugin
    ? { plugin: definition.plugin, options: { ...definition.options, ...options } }
    : undefined;

const lookupEngine = (
  name: string,
  config: PgpmOptions,
  options?: Record<string, unknown>
): ResolvedEngine => {
  const definition = engineDefinitions(config)[name];
  if (!definition) {
    const known = Object.keys(engineDefinitions(config)).sort().join(', ');
    throw new Error(
      `Unknown pgpm engine "${name}". Known engines: ${known}.\n` +
        'Declare it in the "engines" block of pgpm.json, or name its plugin with --driver <package>.'
    );
  }
  return { name, driver: definitionToDriver(definition, options) };
};

/**
 * Resolve which engine a command targets, mirroring sqitch's `core.engine` model:
 * a short engine name selects the backend, and the built-in default is `pg`.
 *
 * Precedence (first match wins):
 * 1. `--driver <package>` — name a driver plugin directly (escape hatch)
 * 2. `--pglite[=dataDir]` — sugar for `--engine pglite`
 * 3. `--engine <name>`
 * 4. the `driver` block of `pgpm.json` — plugin-level configuration
 * 5. the `engine` key of `pgpm.json` / `PGPM_ENGINE`
 * 6. `pg`, the built-in server path
 */
export const resolveEngine = (argv: EngineArgv, config: PgpmOptions): ResolvedEngine => {
  const override = driverOverrideFromArgv(argv);

  if (override) {
    if (override.plugin === PGLITE_DRIVER_PLUGIN && !argv.driver) {
      // `--pglite` is the pglite engine, so it inherits that engine's configured
      // options (e.g. a dataDir declared in pgpm.json) instead of bypassing them.
      return lookupEngine('pglite', config, override.options);
    }
    return { name: override.plugin, driver: override };
  }

  if (argv.engine) return lookupEngine(argv.engine, config);
  if (config.driver) return { name: config.driver.plugin, driver: config.driver };
  return lookupEngine(config.engine ?? DEFAULT_ENGINE, config);
};

/** The engine activated for the running command. */
export interface ActiveEngine {
  engine: ResolvedEngine;
  session?: PgpmDriverSession;
  capabilities: PgpmDriverCapabilities;
}

let active: ActiveEngine | undefined;

/**
 * The engine activated for the running command. Commands read this to skip
 * server-only steps (e.g. `deploy --createdb`) instead of hard-coding backends.
 * Defaults to the built-in server path when nothing has been activated.
 */
export const getActiveEngine = (): ActiveEngine =>
  active ?? { engine: { name: DEFAULT_ENGINE }, capabilities: SERVER_CAPABILITIES };

/**
 * Resolve the engine from argv + `pgpm.json` and activate its driver plugin.
 * The driver has registered its pool/client factories by the time this resolves,
 * so the unmodified pgpm engine runs against the selected backend.
 */
export const activateEngine = async (
  argv: EngineArgv,
  cwd: string = process.cwd()
): Promise<ActiveEngine> => {
  const dir = resolve(cwd);
  const config = getEnvOptions({}, dir);
  const engine = resolveEngine(argv, config);
  const session = await activateDriver(engine.driver, undefined, dir);
  active = { engine, session, capabilities: session?.capabilities ?? SERVER_CAPABILITIES };
  return active;
};

/** Tear down the active driver session and restore the built-in server path. */
export const deactivateEngine = async (): Promise<void> => {
  const session = active?.session;
  active = undefined;
  await session?.teardown();
};
