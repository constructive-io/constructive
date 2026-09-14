import type { ScopedCatalogTypes } from "../pg-introspection";

declare global {
  namespace GraphileBuild {
    interface GatherOptions {
      /**
       * Schema-scoped introspection options keyed by PostgreSQL service name.
       * Services without an entry continue to use stock introspection.
       */
      pgScopedIntrospection?: Readonly<
        Record<string, PgScopedIntrospectionOptions>
      >;
    }
  }
}

export interface PgScopedIntrospectionOptions {
  /** Schemas that the dependency closure may cross into. */
  allowedDependencySchemas?: readonly string[];

  /** Controls how many `pg_catalog` types scoped introspection retains. */
  catalogTypes?: ScopedCatalogTypes;

  /**
   * Extensions whose metadata should be retained even if no scoped object
   * directly depends on them.
   */
  capabilityExtensions?: readonly string[];
}
