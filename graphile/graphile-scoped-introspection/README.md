# graphile-scoped-introspection

An opt-in Graphile plugin that scopes PostgreSQL catalog introspection to the
configured service schemas and their required dependency closure.

```ts
import { ScopedIntrospectionPreset } from 'graphile-scoped-introspection';

const preset = {
  extends: [ScopedIntrospectionPreset],
  pgServices: [
    {
      // standard Graphile PgService fields
      introspectionMode: 'scoped-required',
      introspectionScopedCatalogTypes: 'dependency-closure',
    },
  ],
};
```

The package atomically replaces `PgIntrospectionPlugin` only when its preset
is installed. Stock-only services delegate to the upstream helper unchanged;
mixed stock/scoped services select their catalog query independently.

The scoped SQL is CNC-owned and parameterized. It is adapted from the MIT
licensed `pg-introspection@1.0.1` query and does not patch, import private
subpaths from, or rewrite the installed upstream package.

Database clients use the normal `@dataplan/pg` checkout lifecycle and return
to the pool after each query. Applications remain responsible for calling
`PgService.release()` during final shutdown.
