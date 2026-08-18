import type { ScopedCatalogTypes } from "../pg-introspection";

export interface ScopedIntrospectionServiceOptions {
  scopedIntrospection?: boolean;
  introspectionAllowedDependencySchemas?: readonly string[];
  introspectionScopedCatalogTypes?: ScopedCatalogTypes;
  introspectionCapabilityExtensions?: readonly string[];
}
