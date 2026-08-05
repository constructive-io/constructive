# Upstream review packet: schema-scoped PostgreSQL introspection

No upstream contact has been made. Production use of `scoped-required` remains blocked on Graphile maintainer review.

## Proposed API

Keep `makeIntrospectionQuery(): string` byte-for-byte unchanged and add:

```ts
makeSchemaScopedIntrospectionQuery(
  schemas: readonly string[]
): { text: string; values: [string[]] }
```

The requested names are carried only in `$1::text[]`. Empty, NUL-containing, `pg_*`, and `information_schema` scopes are rejected before SQL execution. The Graphile service option is `introspectionMode: 'stock' | 'scoped-required'`; scoped mode parses the result normally and then asserts that every requested service schema was found. There is no fallback to stock.

## Dependency closure

The recursive namespace graph follows dependencies required to parse selected objects:

- foreign-key source relation → referenced relation;
- relation attribute → attribute type;
- function namespace → argument, OUT-argument, and return types;
- type → base, element, and array types;
- range type → subtype;
- inheritance child → parent.

`pg_catalog` is returned in the namespace payload and its types remain available as in stock introspection. Inheritance deliberately does not follow parent → child: stock introspection emits `pg_inherits` rows only when the child class is selected, and reverse closure pulled a shared partition parent into unrelated tenant child schemas. The disposable partition regression preserved byte-identical SDL while returning only `density_shared` and `pg_catalog`.

## Local evidence

- Stock query stability: 7,332 bytes, SHA-256 `c0ed817b912f78e1ea68c70d89ff4b7f9cb4c02d88112a69ac4109d5b996e4c5`.
- Cross-schema FK/domain/enum/function fixture: stock and scoped Constructive SDL are both 22,538 bytes with SHA-256 `2d899a6f9abcea107987a0aa932f18dd8d1466bca3f4ddd340199316aea1f238`.
- Partition-parent fixture: stock and scoped SDL are both 20,201 bytes with SHA-256 `8f32cab18fa54c8d4c6afa7ab05bed73be770f98c29aa9b1bcd4f29e6f54d532`; hidden tenant child schemas are absent from scoped introspection.
- A missing requested schema fails with `Schema-scoped introspection for service 'main' did not find required schema(s): density_missing`.

The exact evidence is in `artifacts/scoped-introspection-smoke.json`. These are small PostgreSQL 18.4 fixtures, not the required PostgreSQL 17+/61k-catalog benchmark.

## Review questions

1. Is namespace closure the right upstream seam, or should filtering occur by object OID after the stock query generator has expressed every catalog dependency?
2. Which additional OID dependencies must be closed for extensions, composite/domain types, cross-schema defaults/sequences, partitioned tables, procedures, policies, and future introspection versions?
3. Should referenced schemas be included in raw introspection but remain absent from the configured GraphQL surface, as this candidate does?
4. Should missing configured schemas fail in the gather layer, and how should watch-mode schema creation/deletion invalidate a cached failed gather?
5. Can the option live on `PgServiceConfiguration`, and should it take explicit schema names, a callback, or an upstream-defined scope object?
6. What PostgreSQL versions and extension catalogs should upstream CI cover, especially PostgreSQL 17+, PostGIS, vector, BM25, ltree, and partitioning?
7. Can upstream source generate both stock and scoped queries so Constructive can remove its temporary dist patches?

## Requested upstream tests

The upstream change should preserve the stock query byte, compare parsed introspection and emitted GraphQL SDL for the dependency cases above, prove bind-only schema names including quotes, fail on missing schemas, and benchmark catalog rows returned, PostgreSQL peak memory, cold-build time, and retained Node heap at the 61k catalog. Constructive's full plugin and hostile tenant matrix remains a separate downstream responsibility.
