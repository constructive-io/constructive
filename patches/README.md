# Maintained dependency patches

## @dataplan/pg 1.1.1

`@dataplan__pg@1.1.1.patch` makes the public `PgSubscriber.release()` promise await iterator termination, pending connection acquisition, serialized subscription work, `UNLISTEN`, and client return. Failed cleanup destroys the connection and rejects. `makePgService.release()` attempts all reverse releasers, including owned pools, and shares its terminal result across callers.

The patch also updates the published declaration. It preserves the pinned upstream version. PNPM records the patch content hash in `pnpm-lock.yaml`; frozen installs apply it on development machines and CI. Recreate with `pnpm patch @dataplan/pg@1.1.1` and `pnpm patch-commit <edit-directory>`. Reassess this patch when upgrading PostGraphile; remove it only once the upstream release has the same completion contract and the graphile-cache public-boundary tests pass without it.

Regression tests live in `graphile/graphile-cache`; that package runs in the PostgreSQL CI matrix.
