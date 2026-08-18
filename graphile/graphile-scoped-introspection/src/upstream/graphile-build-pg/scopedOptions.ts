import type { ScopedCatalogTypes } from "../pg-introspection";

export type GraphileIntrospectionMode = "stock" | "scoped-required";

export interface ScopedIntrospectionServiceOptions {
  introspectionMode?: GraphileIntrospectionMode;
  introspectionAllowedDependencySchemas?: readonly string[];
  introspectionScopedCatalogTypes?: ScopedCatalogTypes;
  introspectionCapabilityExtensions?: readonly string[];
}
