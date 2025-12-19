# Review checklist — `packages/server`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/server` → `graphql/server`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name`: `@launchql/server` → `@constructive-io/graphql-server`
- [ ] `description` updated
- [ ] `keywords` updated
- [ ] `dependencies` updated

## Renamed / moved (no content changes) (11)
<details>
<summary>Show 11 rename-only paths</summary>

- [ ] `R100` `packages/server/jest.config.js` → `graphql/server/jest.config.js`
- [ ] `R100` `packages/server/src/errors/404-message.ts` → `graphql/server/src/errors/404-message.ts`
- [ ] `R100` `packages/server/src/errors/404.ts` → `graphql/server/src/errors/404.ts`
- [ ] `R100` `packages/server/src/errors/50x.ts` → `graphql/server/src/errors/50x.ts`
- [ ] `R100` `packages/server/src/index.ts` → `graphql/server/src/index.ts`
- [ ] `R100` `packages/server/src/middleware/auth.ts` → `graphql/server/src/middleware/auth.ts`
- [ ] `R100` `packages/server/src/middleware/gql.ts` → `graphql/server/src/middleware/gql.ts`
- [ ] `R100` `packages/server/src/plugins/PublicKeySignature.ts` → `graphql/server/src/plugins/PublicKeySignature.ts`
- [ ] `R100` `packages/server/src/types.ts` → `graphql/server/src/types.ts`
- [ ] `R100` `packages/server/tsconfig.esm.json` → `graphql/server/tsconfig.esm.json`
- [ ] `R100` `packages/server/tsconfig.json` → `graphql/server/tsconfig.json`

</details>

## Renamed / moved (with content changes) (13)
- [ ] `R059` `packages/server/.env` → `graphql/server/.env` (`+3/-3`) — diff: [R059_d2f75c02068c.md](../diffs/R059_d2f75c02068c.md)
- [ ] `R069` `packages/server/README.md` → `graphql/server/README.md` (`+2/-2`) — diff: [R069_8df7d68df4e9.md](../diffs/R069_8df7d68df4e9.md)
- [ ] `R096` `packages/server/__tests__/schema.test.ts` → `graphql/server/__tests__/schema.test.ts` (`+1/-1`) — diff: [R096_71cdf7afdb41.md](../diffs/R096_71cdf7afdb41.md)
- [ ] `R085` `packages/server/package.json` → `graphql/server/package.json` (`+9/-9`) — diff: [R085_94b228a8b197.md](../diffs/R085_94b228a8b197.md)
- [ ] `R099` `packages/server/src/middleware/api.ts` → `graphql/server/src/middleware/api.ts` (`+1/-1`) — diff: [R099_2f69363c7fcd.md](../diffs/R099_2f69363c7fcd.md)
- [ ] `R096` `packages/server/src/middleware/cors.ts` → `graphql/server/src/middleware/cors.ts` (`+2/-2`) — diff: [R096_347ba455e98c.md](../diffs/R096_347ba455e98c.md)
- [ ] `R090` `packages/server/src/middleware/flush.ts` → `graphql/server/src/middleware/flush.ts` (`+2/-2`) — diff: [R090_b156014c75c2.md](../diffs/R090_b156014c75c2.md)
- [ ] `R085` `packages/server/src/middleware/graphile.ts` → `graphql/server/src/middleware/graphile.ts` (`+10/-10`) — diff: [R085_95373098e571.md](../diffs/R085_95373098e571.md)
- [ ] `R092` `packages/server/src/middleware/types.ts` → `graphql/server/src/middleware/types.ts` (`+3/-3`) — diff: [R092_6d1f63de3a07.md](../diffs/R092_6d1f63de3a07.md)
- [ ] `R050` `packages/server/src/run.ts` → `graphql/server/src/run.ts` (`+2/-2`) — diff: [R050_add5dcb9675c.md](../diffs/R050_add5dcb9675c.md)
- [ ] `R098` `packages/server/src/schema.ts` → `graphql/server/src/schema.ts` (`+2/-2`) — diff: [R098_746899d4c553.md](../diffs/R098_746899d4c553.md)
- [ ] `R082` `packages/server/src/scripts/create-bucket.ts` → `graphql/server/src/scripts/create-bucket.ts` (`+3/-3`) — diff: [R082_087f10f20aa5.md](../diffs/R082_087f10f20aa5.md)
- [ ] `R091` `packages/server/src/server.ts` → `graphql/server/src/server.ts` (`+6/-6`) — diff: [R091_a32389c390b7.md](../diffs/R091_a32389c390b7.md)

## Added (1)
- [ ] `A` `graphql/server/CHANGELOG.md` — content: [A_203341862999.md](../diffs/A_203341862999.md)

## Deleted (1)
- [ ] `D` `packages/server/CHANGELOG.md` — content: [D_4fd0289065cb.md](../diffs/D_4fd0289065cb.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/server`
- [ ] `rg -n '@launchql/' graphql/server`
