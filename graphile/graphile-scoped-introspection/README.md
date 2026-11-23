# graphile-scoped-introspection

An opt-in Graphile plugin that scopes PostgreSQL catalog introspection to the
configured service schemas and their required dependency closure.

```ts
import { ScopedIntrospectionPreset } from 'graphile-scoped-introspection';

const preset = {
  extends: [ScopedIntrospectionPreset],
  gather: {
    pgScopedIntrospection: {
      main: true,
    },
  },
  pgServices: [
    {
      // standard Graphile PgService fields
      name: 'main',
      schemas: ['app_public'],
    },
  ],
};
```

With `main: true`, the scoped query uses `catalogTypes: 'all'`: it retains the
dependency closure needed by the selected schemas and all `pg_catalog` types.
It does not expose every user schema or every catalog object. Services omitted
from `gather.pgScopedIntrospection`, or mapped to `false`, use stock
introspection.

Use an options object when the dependency-only policy or extension capability
metadata is needed:

```ts
gather: {
  pgScopedIntrospection: {
    main: {
      catalogTypes: 'dependency-closure',
      capabilityExtensions: ['pg_trgm'],
    },
  },
},
```

The query follows real PostgreSQL dependencies across schemas automatically;
there is no dependency-schema allowlist. It also follows `@foreignKey` smart
tags in table, view and composite type comments, because graphile-build-pg
resolves those targets by name and fails the whole build when one is missing.
Tags are read the way graphile-build-pg reads them, targets in other schemas
are retained, and their own tags are followed in turn. Smart tags supplied by
plugins (for example JSON smart tags) and `@interface` polymorphism tags are
not visible to the query, so their targets must be reachable some other way.
`capabilityExtensions` records the
requested extension capability metadata and does not add user schemas to the
scope. Unknown service names fail validation even when mapped to `false`.

The package atomically replaces `PgIntrospectionPlugin` only when its preset
is installed. `true` enables scoped introspection with defaults; an options
object selects the catalog type policy and optional extension capability
metadata.

The scoped SQL is CNC-owned and parameterized. It is adapted from the MIT
licensed `pg-introspection@1.0.1` query and does not patch, import private
subpaths from, or rewrite the installed upstream package.

Use `makeSchemaScopedIntrospectionPlan` when the query result will be parsed
and validated. It returns the normalized schema and option scope alongside the
parameterized query; `makeSchemaScopedIntrospectionQuery` remains available for
callers that only need the SQL.

Database clients use the normal `@dataplan/pg` checkout lifecycle and return
to the pool after each query. Applications remain responsible for calling
`PgService.release()` during final shutdown.
