# Review checklist — `packages/cli`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/cli` → `@constructive-io/cli`
- [ ] `description` updated
- [ ] `bin` updated
- [ ] `keywords` updated
- [ ] `dependencies` updated

## Modified (content changes) (27)
- [ ] `M` `packages/cli/AGENTS.md` (`+27/-478`) — diff: [M_36ef7b79657e.md](../diffs/M_36ef7b79657e.md)
- [ ] `M` `packages/cli/CHANGELOG.md` (`+4/-4`) — diff: [M_aaab89ad9ede.md](../diffs/M_aaab89ad9ede.md)
- [ ] `M` `packages/cli/README.md` (`+92/-92`) — diff: [M_78732f3c004f.md](../diffs/M_78732f3c004f.md)
- [ ] `M` `packages/cli/__tests__/__snapshots__/add.test.ts.snap` (`+24/-24`) — diff: [M_d3c17cd8814b.md](../diffs/M_d3c17cd8814b.md)
- [ ] `M` `packages/cli/__tests__/__snapshots__/init.install.test.ts.snap` (`+201/-201`) — diff: [M_48805f780565.md](../diffs/M_48805f780565.md)
- [ ] `M` `packages/cli/__tests__/add.test.ts` (`+13/-9`) — diff: [M_c890f80cecb9.md](../diffs/M_c890f80cecb9.md)
- [ ] `M` `packages/cli/__tests__/cli-deploy-fixture.test.ts` (`+6/-6`) — diff: [M_082c64c6daa1.md](../diffs/M_082c64c6daa1.md)
- [ ] `M` `packages/cli/__tests__/cli-deploy-stage-unique-names.test.ts` (`+2/-2`) — diff: [M_61580404e6fb.md](../diffs/M_61580404e6fb.md)
- [ ] `M` `packages/cli/__tests__/codegen.test.ts` (`+15/-15`) — diff: [M_a74df380be1e.md](../diffs/M_a74df380be1e.md)
- [ ] `M` `packages/cli/__tests__/deploy-revert-w-tags.test.ts` (`+5/-5`) — diff: [M_b0cbf04212b2.md](../diffs/M_b0cbf04212b2.md)
- [ ] `M` `packages/cli/__tests__/deploy.test.ts` (`+8/-8`) — diff: [M_40292114cc73.md](../diffs/M_40292114cc73.md)
- [ ] `M` `packages/cli/__tests__/get-graphql-schema.test.ts` (`+8/-8`) — diff: [M_ae8271207e9c.md](../diffs/M_ae8271207e9c.md)
- [ ] `M` `packages/cli/__tests__/init.install.test.ts` (`+6/-6`) — diff: [M_6e01fe15586d.md](../diffs/M_6e01fe15586d.md)
- [ ] `M` `packages/cli/__tests__/init.templates.test.ts` (`+2/-2`) — diff: [M_515d6a62ef7d.md](../diffs/M_515d6a62ef7d.md)
- [ ] `M` `packages/cli/__tests__/init.test.ts` (`+2/-2`) — diff: [M_5489b74dbfb0.md](../diffs/M_5489b74dbfb0.md)
- [ ] `M` `packages/cli/__tests__/package-alias.test.ts` (`+5/-5`) — diff: [M_8a5d80b661d6.md](../diffs/M_8a5d80b661d6.md)
- [ ] `M` `packages/cli/__tests__/package.test.ts` (`+3/-3`) — diff: [M_cfb76d8e6adf.md](../diffs/M_cfb76d8e6adf.md)
- [ ] `M` `packages/cli/__tests__/tags.test.ts` (`+17/-17`) — diff: [M_89c146705071.md](../diffs/M_89c146705071.md)
- [ ] `M` `packages/cli/package.json` (`+10/-10`) — diff: [M_7f226a0e4d67.md](../diffs/M_7f226a0e4d67.md)
- [ ] `M` `packages/cli/src/commands.ts` (`+2/-2`) — diff: [M_b306f72d1a4a.md](../diffs/M_b306f72d1a4a.md)
- [ ] `M` `packages/cli/src/commands/codegen.ts` (`+11/-11`) — diff: [M_c0e31820d723.md](../diffs/M_c0e31820d723.md)
- [ ] `M` `packages/cli/src/commands/explorer.ts` (`+7/-7`) — diff: [M_b5de66c4b865.md](../diffs/M_b5de66c4b865.md)
- [ ] `M` `packages/cli/src/commands/get-graphql-schema.ts` (`+6/-6`) — diff: [M_11418897de43.md](../diffs/M_11418897de43.md)
- [ ] `M` `packages/cli/src/commands/server.ts` (`+9/-9`) — diff: [M_41e763033210.md](../diffs/M_41e763033210.md)
- [ ] `M` `packages/cli/src/utils/display.ts` (`+7/-7`) — diff: [M_d4a5942ddcab.md](../diffs/M_d4a5942ddcab.md)
- [ ] `M` `packages/cli/test-utils/CLIDeployTestFixture.ts` (`+2/-2`) — diff: [M_eebaadcda92f.md](../diffs/M_eebaadcda92f.md)
- [ ] `M` `packages/cli/test-utils/fixtures.ts` (`+1/-1`) — diff: [M_e00d46bdec94.md](../diffs/M_e00d46bdec94.md)

## Deleted (1)
- [ ] `D` `packages/cli/test_output.log` — content: [D_1d58a19ddb53.md](../diffs/D_1d58a19ddb53.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' packages/cli`
- [ ] `rg -n '@launchql/' packages/cli`
