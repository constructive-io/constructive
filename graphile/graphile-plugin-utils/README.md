# graphile-plugin-utils

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-plugin-utils"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-plugin-utils%2Fpackage.json"/></a>
</p>


Shared internals for Constructive's PostGraphile v5 plugins. This package holds
the small cross-plugin helpers that would otherwise be duplicated across
`graphile-connection-filter`, `graphile-search`, and `graphile-pg-aggregates`,
so there is a single home for them and no plugin has to depend on a sibling
feature plugin just to borrow a utility.

## Installation

```bash
npm install graphile-plugin-utils
```

## API

### `getQueryBuilder(build, $condition)`

Walks from a `PgCondition` up to its `PgSelectQueryBuilder`, following Benjie's
pattern from `postgraphile-plugin-fulltext-filter`. Satellite filter plugins
(search, BM25, pgvector) use it from inside a filter's `apply` callback to
inject `SELECT` expressions (for ranking/scoring) and `ORDER BY` clauses.

```ts
import { getQueryBuilder } from 'graphile-plugin-utils';

const qb = getQueryBuilder(build, $condition);
if (qb) {
  qb.orderBy({ /* ... */ });
}
```

Returns the query builder, or `null` when it cannot be resolved (e.g. the build
does not expose `dataplanPg.PgCondition`).

### `isComputedScalarAttributeResource(resource)`

Type guard for a computed scalar attribute function — a `pgResource` that takes
a table row as its first parameter, returns a scalar, and is unique. Used to
recognise computed columns exposed as functions when building filters and
aggregates.

```ts
import { isComputedScalarAttributeResource } from 'graphile-plugin-utils';

const computed = Object.values(build.input.pgRegistry.pgResources).filter(
  isComputedScalarAttributeResource
);
```

## License

MIT
