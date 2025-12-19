# Review checklist — `packages/react`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/react` → `graphql/react`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/react` → `@constructive-io/graphql-react`
- [ ] `description` updated
- [ ] `dependencies` updated

## Renamed / moved (no content changes) (8)
<details>
<summary>Show 8 rename-only paths</summary>

- [ ] `R100` `packages/react/jest.config.js` → `graphql/react/jest.config.js`
- [ ] `R100` `packages/react/src/context.ts` → `graphql/react/src/context.ts`
- [ ] `R100` `packages/react/src/provider.tsx` → `graphql/react/src/provider.tsx`
- [ ] `R100` `packages/react/src/use-graphql-client.ts` → `graphql/react/src/use-graphql-client.ts`
- [ ] `R100` `packages/react/src/use-introspection.ts` → `graphql/react/src/use-introspection.ts`
- [ ] `R100` `packages/react/src/use-schema-meta.ts` → `graphql/react/src/use-schema-meta.ts`
- [ ] `R100` `packages/react/tsconfig.esm.json` → `graphql/react/tsconfig.esm.json`
- [ ] `R100` `packages/react/tsconfig.json` → `graphql/react/tsconfig.json`

</details>

## Renamed / moved (with content changes) (6)
- [ ] `R070` `packages/react/README.md` → `graphql/react/README.md` (`+2/-2`) — diff: [R070_367e5e1354c5.md](../diffs/R070_367e5e1354c5.md)
- [ ] `R098` `packages/react/__tests__/basic.test.tsx` → `graphql/react/__tests__/basic.test.tsx` (`+2/-2`) — diff: [R098_cae9d1c77eef.md](../diffs/R098_cae9d1c77eef.md)
- [ ] `R084` `packages/react/package.json` → `graphql/react/package.json` (`+4/-4`) — diff: [R084_74f79a1da407.md](../diffs/R084_74f79a1da407.md)
- [ ] `R082` `packages/react/src/index.ts` → `graphql/react/src/index.ts` (`+1/-1`) — diff: [R082_e7e519b6540d.md](../diffs/R082_e7e519b6540d.md)
- [ ] `R080` `packages/react/src/use-launchql-client.ts` → `graphql/react/src/use-constructive-client.ts` (`+2/-2`) — diff: [R080_4358f363e4df.md](../diffs/R080_4358f363e4df.md)
- [ ] `R086` `packages/react/src/use-table-rows.ts` → `graphql/react/src/use-table-rows.ts` (`+17/-17`) — diff: [R086_0c283a3213e4.md](../diffs/R086_0c283a3213e4.md)

## Added (1)
- [ ] `A` `graphql/react/CHANGELOG.md` — content: [A_7404ee518436.md](../diffs/A_7404ee518436.md)

## Deleted (1)
- [ ] `D` `packages/react/CHANGELOG.md` — content: [D_d4c9f8708595.md](../diffs/D_d4c9f8708595.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/react`
- [ ] `rg -n '@launchql/' graphql/react`
