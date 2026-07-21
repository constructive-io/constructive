/**
 * Pluggable migration-backend ("driver") contract.
 *
 * pgpm's engine only needs a node-`pg`-shaped pool/client (see `pg-cache` /
 * `pgsql-client` seams). A *driver plugin* is a package that registers those
 * factories against some backend (e.g. in-process PGlite) and tells pgpm which
 * server-only steps to skip. pgpm core/CLI depend on this contract only — never
 * on any specific backend or its dependencies. The plugin is resolved from the
 * *consumer's* project, exactly like ESLint/Babel resolve plugins and presets.
 */

/**
 * What a backend can and cannot do, so the CLI can generically skip server-only
 * steps instead of hard-coding per-backend branches.
 */
export interface PgpmDriverCapabilities {
    /** `false` → skip `createdb` / `--createdb` (the instance *is* the database). */
    createdb: boolean;
    /** `false` → skip `pg_dump` / `pgpm dump` (or the plugin provides its own dump). */
    dump: boolean;
    /** `false` → skip docker / server-lifecycle commands. */
    serverLifecycle: boolean;
    /**
     * `false` → single-session backend: skip the two-connection `admin-users`
     * bootstrap; roles are provisioned in-band instead.
     */
    multiConnection: boolean;
}

/**
 * The activated backend session returned by a driver plugin. The plugin has
 * already registered its pool/client factories by the time this resolves.
 */
export interface PgpmDriverSession {
    /** Backend capabilities used to gate server-only CLI steps. */
    capabilities: PgpmDriverCapabilities;
    /** Restore the previously-active factories and release backend resources. */
    teardown: () => Promise<void>;
}

/**
 * The well-known entrypoint every driver plugin must export as
 * `createPgpmDriver`. Called by the CLI after it resolves the plugin from the
 * consumer's `node_modules`. Implementations register their pool/client
 * factories (via the `pg-cache` / `pgsql-client` seams) and return their
 * capabilities plus a teardown.
 */
export type PgpmDriverFactory = (
    options?: Record<string, unknown>
) => Promise<PgpmDriverSession>;

/**
 * Selects and configures a pluggable migration backend. Configured under the
 * `driver` key of `pgpm.json`; undefined means the built-in `pg` (server) path.
 */
export interface PgpmDriverConfig {
    /**
     * Package name of the driver plugin, resolved from the consumer's
     * `node_modules` (e.g. `@pgpmjs/pglite-adapter`).
     */
    plugin: string;
    /** Opaque options forwarded to the plugin's `createPgpmDriver(options)`. */
    options?: Record<string, unknown>;
}

/** Named export a driver plugin module must expose. */
export const PGPM_DRIVER_EXPORT = 'createPgpmDriver' as const;
