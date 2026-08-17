/**
 * Loader Registry — manages a set of ModuleLoader instances.
 *
 * Supports two resolution modes:
 *   - Lazy (preferred): `resolve(name, ctx)` resolves a single loader
 *     on-demand. Only fires the SQL query if the cache misses. Middleware
 *     requests only the loaders it actually needs.
 *   - Eager: `resolveAll(ctx)` resolves every registered loader in
 *     parallel. Useful for pre-warming or migration from the monolithic
 *     svcCache pattern.
 *
 * Each loader's result is independently cached per exact pool/schema/database
 * contract — resolving one module never invalidates another.
 */

import { Logger } from '@pgpmjs/logger';

import type { LoaderContext, ModuleLoader } from './types';

const log = new Logger('loader-registry');

export interface LoaderRegistry {
  /** Register a loader. Throws if a loader with the same name already exists. */
  register(loader: ModuleLoader): void;

  /**
   * Resolve a single loader by name (lazy, on-demand).
   * Returns undefined if the loader isn't registered or the module
   * isn't provisioned for this database. Results are cached per exact context
   * contract inside the loader's own LRU — repeated calls are cheap.
   */
  resolve<T = unknown>(name: string, ctx: LoaderContext): Promise<T | undefined>;

  /** Resolve all registered loaders in parallel (eager, for migration/pre-warm). */
  resolveAll(ctx: LoaderContext): Promise<Record<string, unknown>>;

  /** Get a specific loader by name (for direct access / advanced usage). */
  get<T = unknown>(name: string): ModuleLoader<T> | undefined;

  /** Check whether a loader is registered. */
  has(name: string): boolean;

  /** Invalidate one database, optionally limited to an exact pool pair. */
  invalidate(databaseId?: string, context?: LoaderContext): void;

  /** List all registered loader names. */
  readonly names: string[];
}

export function createLoaderRegistry(): LoaderRegistry {
  const loaders = new Map<string, ModuleLoader>();

  return {
    register(loader: ModuleLoader): void {
      if (loaders.has(loader.name)) {
        throw new Error(`Loader "${loader.name}" is already registered`);
      }
      loaders.set(loader.name, loader);
      log.debug(`Registered loader: ${loader.name}`);
    },

    async resolve<T = unknown>(name: string, ctx: LoaderContext): Promise<T | undefined> {
      const loader = loaders.get(name) as ModuleLoader<T> | undefined;
      if (!loader) {
        log.debug(`Loader "${name}" not registered, returning undefined`);
        return undefined;
      }
      return loader.resolve(ctx);
    },

    async resolveAll(ctx: LoaderContext): Promise<Record<string, unknown>> {
      if (loaders.size === 0) return {};

      const entries = Array.from(loaders.entries());
      const results = await Promise.all(
        entries.map(async ([name, loader]) => {
          const value = await loader.resolve(ctx);
          return [name, value] as const;
        }),
      );

      const modules: Record<string, unknown> = {};
      for (const [name, value] of results) {
        if (value !== undefined) {
          modules[name] = value;
        }
      }
      return modules;
    },

    get<T = unknown>(name: string): ModuleLoader<T> | undefined {
      return loaders.get(name) as ModuleLoader<T> | undefined;
    },

    has(name: string): boolean {
      return loaders.has(name);
    },

    invalidate(databaseId?: string, context?: LoaderContext): void {
      for (const loader of loaders.values()) {
        loader.invalidate(databaseId, context);
      }
      log.debug(
        databaseId
          ? `Invalidated all loaders for databaseId=${databaseId}`
          : 'Invalidated all loaders',
      );
    },

    get names(): string[] {
      return Array.from(loaders.keys());
    },
  };
}
