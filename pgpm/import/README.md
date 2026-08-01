# @pgpmjs/import

`pgpm import` engine: pgpm-itize arbitrary SQL dumps (plain `pg_dump` output or raw `.sql` files) through the dials pipeline.

- `dump-source` — preprocess dump text: strip psql backslash commands, extract `COPY ... FROM stdin` blocks, convert COPY data to INSERTs.
- `import` — `importDumpRows`: classify statements, attach riders (grants/comments/ownership) to their host objects, route through the shared restructure seam (`@pgpmjs/transform`), and emit deployable `PgpmRow`s with generated revert/verify.

Used by the `pgpm import` CLI command (`pgpm/cli`). Sibling front doors: `@pgpmjs/export` (live database), `@pgpmjs/diff` (semantic diff).
