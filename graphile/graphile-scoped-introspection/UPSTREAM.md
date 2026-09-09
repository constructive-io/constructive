# Upstream provenance

The files under `src/upstream/pg-introspection` and
`src/upstream/graphile-build-pg` are derived from the MIT-licensed Graphile
Crystal repository at commit:

`fb9792dd4e64601530026d1ec4079652a4f33c1c`

That commit publishes `pg-introspection@1.0.1` and
`graphile-build-pg@5.1.3`, matching the versions pinned by CNC.

Copied paths:

- `utils/pg-introspection/src/*.ts`
- `graphile-build/graphile-build-pg/src/plugins/PgIntrospectionPlugin.ts`
- `graphile-build/graphile-build-pg/src/version.ts`
- `graphile-build/graphile-build-pg/src/watchFixtures.ts`

The baseline copy has only the integration adaptations needed to compile the
published sources as an isolated CNC package:

- relative imports and TypeScript extension syntax match the CNC package layout;
- the published `graphile-build-pg` declarations are loaded for registry and
  service types that the original monorepo supplied through its compilation
  unit (including the standard PG adaptor), and its public
  `pg-introspection` types remain the plugin contract;
- Crystal's `useUnknownInCatchVariables: false` setting is retained; and
- one otherwise-contextual `description` value has an explicit type annotation.

Functional changes are layered in separate commits. The copied source keeps its
upstream formatting so future comparisons remain useful.
