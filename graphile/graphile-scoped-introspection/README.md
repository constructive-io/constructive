# graphile-scoped-introspection

CNC-owned, upstream-shaped PostgreSQL introspection plugin. The package starts
from the published Graphile implementations that own the two relevant seams:

- `pg-introspection@1.0.1` query generation and result augmentation;
- `graphile-build-pg@5.1.3` `PgIntrospectionPlugin` orchestration.

The copied source is kept together so scoped changes remain reviewable against
the upstream package boundaries. See `UPSTREAM.md` and `UPSTREAM_LICENSE.md` for
provenance and licensing.
