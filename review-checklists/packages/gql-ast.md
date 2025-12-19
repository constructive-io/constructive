# Review checklist — `packages/gql-ast`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/gql-ast` → `graphql/gql-ast`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `gql-ast`
- [ ] `keywords` updated

## Renamed / moved (no content changes) (6)
<details>
<summary>Show 6 rename-only paths</summary>

- [ ] `R100` `packages/gql-ast/CHANGELOG.md` → `graphql/gql-ast/CHANGELOG.md`
- [ ] `R100` `packages/gql-ast/README.md` → `graphql/gql-ast/README.md`
- [ ] `R100` `packages/gql-ast/jest.config.js` → `graphql/gql-ast/jest.config.js`
- [ ] `R100` `packages/gql-ast/src/index.ts` → `graphql/gql-ast/src/index.ts`
- [ ] `R100` `packages/gql-ast/tsconfig.esm.json` → `graphql/gql-ast/tsconfig.esm.json`
- [ ] `R100` `packages/gql-ast/tsconfig.json` → `graphql/gql-ast/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R094` `packages/gql-ast/package.json` → `graphql/gql-ast/package.json` (`+2/-2`) — diff: [R094_a8c98e882de4.md](../diffs/R094_a8c98e882de4.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/gql-ast`
- [ ] `rg -n '@launchql/' graphql/gql-ast`
