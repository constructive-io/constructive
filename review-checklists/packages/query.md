# Review checklist — `packages/query`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/query` → `graphql/query`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/query` → `@constructive-io/graphql-query`
- [ ] `description` updated
- [ ] `keywords` updated

## Renamed / moved (no content changes) (17)
<details>
<summary>Show 17 rename-only paths</summary>

- [ ] `R100` `packages/query/__fixtures__/api/introspection.json` → `graphql/query/__fixtures__/api/introspection.json`
- [ ] `R100` `packages/query/__fixtures__/api/meta-obj.json` → `graphql/query/__fixtures__/api/meta-obj.json`
- [ ] `R100` `packages/query/__fixtures__/api/meta-schema.json` → `graphql/query/__fixtures__/api/meta-schema.json`
- [ ] `R100` `packages/query/__tests__/__snapshots__/builder.test.ts.snap` → `graphql/query/__tests__/__snapshots__/builder.test.ts.snap`
- [ ] `R100` `packages/query/__tests__/__snapshots__/meta-object.test.ts.snap` → `graphql/query/__tests__/__snapshots__/meta-object.test.ts.snap`
- [ ] `R100` `packages/query/__tests__/builder.test.ts` → `graphql/query/__tests__/builder.test.ts`
- [ ] `R100` `packages/query/__tests__/meta-object.test.ts` → `graphql/query/__tests__/meta-object.test.ts`
- [ ] `R100` `packages/query/jest.config.js` → `graphql/query/jest.config.js`
- [ ] `R100` `packages/query/src/ast.ts` → `graphql/query/src/ast.ts`
- [ ] `R100` `packages/query/src/custom-ast.ts` → `graphql/query/src/custom-ast.ts`
- [ ] `R100` `packages/query/src/index.ts` → `graphql/query/src/index.ts`
- [ ] `R100` `packages/query/src/meta-object/convert.ts` → `graphql/query/src/meta-object/convert.ts`
- [ ] `R100` `packages/query/src/meta-object/format.json` → `graphql/query/src/meta-object/format.json`
- [ ] `R100` `packages/query/src/meta-object/index.ts` → `graphql/query/src/meta-object/index.ts`
- [ ] `R100` `packages/query/src/meta-object/validate.ts` → `graphql/query/src/meta-object/validate.ts`
- [ ] `R100` `packages/query/tsconfig.esm.json` → `graphql/query/tsconfig.esm.json`
- [ ] `R100` `packages/query/tsconfig.json` → `graphql/query/tsconfig.json`

</details>

## Renamed / moved (with content changes) (4)
- [ ] `R058` `packages/query/CHANGELOG.md` → `graphql/query/CHANGELOG.md` (`+2/-2`) — diff: [R058_3348ec7bd146.md](../diffs/R058_3348ec7bd146.md)
- [ ] `R086` `packages/query/README.md` → `graphql/query/README.md` (`+5/-5`) — diff: [R086_965c40bf4631.md](../diffs/R086_965c40bf4631.md)
- [ ] `R095` `packages/query/__fixtures__/generate-fixtures.js` → `graphql/query/__fixtures__/generate-fixtures.js` (`+1/-1`) — diff: [R095_a9b9481d004d.md](../diffs/R095_a9b9481d004d.md)
- [ ] `R087` `packages/query/package.json` → `graphql/query/package.json` (`+4/-4`) — diff: [R087_3b9286e7e61a.md](../diffs/R087_3b9286e7e61a.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/query`
- [ ] `rg -n '@launchql/' graphql/query`
