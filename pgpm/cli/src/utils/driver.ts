import {
  PGPM_DRIVER_EXPORT,
  PgpmDriverConfig,
  PgpmDriverFactory,
  PgpmDriverSession,
} from '@pgpmjs/types';
import { createRequire } from 'node:module';
import { join } from 'node:path';

/** Package name of the built-in PGlite driver plugin (the `--pglite` alias). */
export const PGLITE_DRIVER_PLUGIN = '@pgpmjs/pglite-adapter';

/**
 * Resolve the effective driver config from `pgpm.json` and CLI overrides.
 *
 * Precedence: an explicit override (from `--driver <pkg>` or the `--pglite`
 * alias) beats the configured `driver` block. `--pglite=<dataDir>` sets
 * `options.dataDir`. Returns undefined for the built-in `pg` (server) path.
 */
export function resolveDriverConfig(
  configured: PgpmDriverConfig | undefined,
  override?: { plugin: string; options?: Record<string, unknown> }
): PgpmDriverConfig | undefined {
  if (override) {
    // Merge override options over configured options when targeting the same plugin.
    const base =
      configured && configured.plugin === override.plugin ? configured.options : undefined;
    return {
      plugin: override.plugin,
      options: { ...base, ...override.options },
    };
  }
  return configured;
}

/**
 * Translate the `--pglite` / `--driver` argv into a driver override.
 *
 * - `--pglite` (bare)        → PGlite in-memory
 * - `--pglite=./local.db`    → PGlite persisted to `./local.db`
 * - `--driver <pkg>`         → arbitrary driver plugin
 */
export function driverOverrideFromArgv(argv: {
  pglite?: boolean | string;
  driver?: string;
}): { plugin: string; options?: Record<string, unknown> } | undefined {
  if (argv.pglite !== undefined && argv.pglite !== false) {
    const options =
      typeof argv.pglite === 'string' && argv.pglite.length > 0
        ? { dataDir: argv.pglite }
        : undefined;
    return { plugin: PGLITE_DRIVER_PLUGIN, options };
  }
  if (argv.driver) {
    return { plugin: argv.driver };
  }
  return undefined;
}

/**
 * Load and activate the configured driver plugin, resolving it from the
 * *consumer's* project (`cwd`) — the same way ESLint/Babel resolve plugins.
 * pgpm ships no backend dependencies; the plugin is declared by the user's
 * project. Returns undefined on the built-in server path.
 *
 * Resolution uses `createRequire` from `node:module` (not the ambient
 * `require`) so it behaves identically in both makage build outputs: the CJS
 * bundle and the `es2022` ESM bundle, where a bare `require`/`require.resolve`
 * is undefined at runtime.
 */
export async function activateDriver(
  configured: PgpmDriverConfig | undefined,
  override: { plugin: string; options?: Record<string, unknown> } | undefined,
  cwd: string
): Promise<PgpmDriverSession | undefined> {
  const cfg = resolveDriverConfig(configured, override);
  if (!cfg) return undefined;

  // A require bound to the consumer's project directory. `createRequire` is the
  // one primitive available and identical in both CJS and ESM runtimes.
  const requireFrom = createRequire(join(cwd, 'package.json'));

  let mod: Record<string, unknown>;
  try {
    const entry = requireFrom.resolve(cfg.plugin);
    mod = requireFrom(entry);
  } catch {
    const extra = cfg.plugin.includes('pglite') ? ' @electric-sql/pglite' : '';
    throw new Error(
      `pgpm driver "${cfg.plugin}" is not installed in this project.\n` +
        `Run: npm i ${cfg.plugin}${extra}`
    );
  }

  // Support both a direct named export and an interop `default` wrapper.
  const factory = (mod[PGPM_DRIVER_EXPORT] ??
    (mod.default as Record<string, unknown> | undefined)?.[PGPM_DRIVER_EXPORT]) as
    | PgpmDriverFactory
    | undefined;
  if (typeof factory !== 'function') {
    throw new Error(
      `"${cfg.plugin}" does not export ${PGPM_DRIVER_EXPORT} — it is not a pgpm driver plugin.`
    );
  }

  return factory(cfg.options);
}
