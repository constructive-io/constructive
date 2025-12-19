# Review checklist — `packages/core`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/core` → `pgpm/core`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `@pgpmjs/core`

## Renamed / moved (no content changes) (92)
<details>
<summary>Show 92 rename-only paths</summary>

- [ ] `R100` `packages/core/CHANGELOG.md` → `pgpm/core/CHANGELOG.md`
- [ ] `R100` `packages/core/README.md` → `pgpm/core/README.md`
- [ ] `R100` `packages/core/__tests__/core/__snapshots__/module-extensions.test.ts.snap` → `pgpm/core/__tests__/core/__snapshots__/module-extensions.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/core/analyze-module.test.ts` → `pgpm/core/__tests__/core/analyze-module.test.ts`
- [ ] `R100` `packages/core/__tests__/core/module-extensions-with-tags.test.ts` → `pgpm/core/__tests__/core/module-extensions-with-tags.test.ts`
- [ ] `R100` `packages/core/__tests__/core/module-extensions.test.ts` → `pgpm/core/__tests__/core/module-extensions.test.ts`
- [ ] `R100` `packages/core/__tests__/core/rename-module.test.ts` → `pgpm/core/__tests__/core/rename-module.test.ts`
- [ ] `R100` `packages/core/__tests__/core/stage-unique-names-control.test.ts` → `pgpm/core/__tests__/core/stage-unique-names-control.test.ts`
- [ ] `R100` `packages/core/__tests__/files/plan/__snapshots__/plan-parsing-invalid-fixtures.test.ts.snap` → `pgpm/core/__tests__/files/plan/__snapshots__/plan-parsing-invalid-fixtures.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/files/plan/plan-file-parsing.test.ts` → `pgpm/core/__tests__/files/plan/plan-file-parsing.test.ts`
- [ ] `R100` `packages/core/__tests__/files/plan/plan-parsing-invalid-fixtures.test.ts` → `pgpm/core/__tests__/files/plan/plan-parsing-invalid-fixtures.test.ts`
- [ ] `R100` `packages/core/__tests__/files/plan/plan-parsing-valid-fixtures.test.ts` → `pgpm/core/__tests__/files/plan/plan-parsing-valid-fixtures.test.ts`
- [ ] `R100` `packages/core/__tests__/files/plan/plan-validation-utilities.test.ts` → `pgpm/core/__tests__/files/plan/plan-validation-utilities.test.ts`
- [ ] `R100` `packages/core/__tests__/files/plan/stage-unique-names-plan.test.ts` → `pgpm/core/__tests__/files/plan/stage-unique-names-plan.test.ts`
- [ ] `R100` `packages/core/__tests__/migrate/local-tracking-guard.test.ts` → `pgpm/core/__tests__/migrate/local-tracking-guard.test.ts`
- [ ] `R100` `packages/core/__tests__/migration/basic-deployment.test.ts` → `pgpm/core/__tests__/migration/basic-deployment.test.ts`
- [ ] `R100` `packages/core/__tests__/migration/cross-project-dependencies.test.ts` → `pgpm/core/__tests__/migration/cross-project-dependencies.test.ts`
- [ ] `R100` `packages/core/__tests__/migration/stage-deployment-with-plan.test.ts` → `pgpm/core/__tests__/migration/stage-deployment-with-plan.test.ts`
- [ ] `R100` `packages/core/__tests__/migration/stage-deployment.test.ts` → `pgpm/core/__tests__/migration/stage-deployment.test.ts`
- [ ] `R100` `packages/core/__tests__/migration/tag-based-migration.test.ts` → `pgpm/core/__tests__/migration/tag-based-migration.test.ts`
- [ ] `R100` `packages/core/__tests__/modules/__snapshots__/module-packaging-tags.test.ts.snap` → `pgpm/core/__tests__/modules/__snapshots__/module-packaging-tags.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/modules/__snapshots__/module-packaging.test.ts.snap` → `pgpm/core/__tests__/modules/__snapshots__/module-packaging.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/modules/__snapshots__/module-publishing.test.ts.snap` → `pgpm/core/__tests__/modules/__snapshots__/module-publishing.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/modules/module-packaging-tags.test.ts` → `pgpm/core/__tests__/modules/module-packaging-tags.test.ts`
- [ ] `R100` `packages/core/__tests__/modules/module-publishing.test.ts` → `pgpm/core/__tests__/modules/module-publishing.test.ts`
- [ ] `R100` `packages/core/__tests__/projects/__snapshots__/deploy-failure-scenarios.test.ts.snap` → `pgpm/core/__tests__/projects/__snapshots__/deploy-failure-scenarios.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/projects/clear-functionality.test.ts` → `pgpm/core/__tests__/projects/clear-functionality.test.ts`
- [ ] `R100` `packages/core/__tests__/projects/deploy-failure-scenarios.test.ts` → `pgpm/core/__tests__/projects/deploy-failure-scenarios.test.ts`
- [ ] `R100` `packages/core/__tests__/projects/deploy-modules.test.ts` → `pgpm/core/__tests__/projects/deploy-modules.test.ts`
- [ ] `R100` `packages/core/__tests__/projects/remove-functionality.test.ts` → `pgpm/core/__tests__/projects/remove-functionality.test.ts`
- [ ] `R100` `packages/core/__tests__/projects/verify-modules.test.ts` → `pgpm/core/__tests__/projects/verify-modules.test.ts`
- [ ] `R100` `packages/core/__tests__/projects/verify-partial.test.ts` → `pgpm/core/__tests__/projects/verify-partial.test.ts`
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-basic.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-basic.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-internal-tags.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-internal-tags.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-resolved-tags.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-resolved-tags.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-with-tags.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-with-tags.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/resolution/__snapshots__/sql-script-resolution-cross-dependencies.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/sql-script-resolution-cross-dependencies.test.ts.snap`
- [ ] `R100` `packages/core/__tests__/resolution/dependency-resolution-internal-tags.test.ts` → `pgpm/core/__tests__/resolution/dependency-resolution-internal-tags.test.ts`
- [ ] `R100` `packages/core/__tests__/resolution/dependency-resolution-resolved-tags.test.ts` → `pgpm/core/__tests__/resolution/dependency-resolution-resolved-tags.test.ts`
- [ ] `R100` `packages/core/__tests__/resolution/dependency-resolution-with-tags.test.ts` → `pgpm/core/__tests__/resolution/dependency-resolution-with-tags.test.ts`
- [ ] `R100` `packages/core/__tests__/resolution/header-format-compatibility.test.ts` → `pgpm/core/__tests__/resolution/header-format-compatibility.test.ts`
- [ ] `R100` `packages/core/__tests__/resolution/sql-script-resolution-cross-dependencies.test.ts` → `pgpm/core/__tests__/resolution/sql-script-resolution-cross-dependencies.test.ts`
- [ ] `R100` `packages/core/__tests__/resolution/sql-script-resolution-revert.test.ts` → `pgpm/core/__tests__/resolution/sql-script-resolution-revert.test.ts`
- [ ] `R100` `packages/core/__tests__/resolution/sql-script-resolution.test.ts` → `pgpm/core/__tests__/resolution/sql-script-resolution.test.ts`
- [ ] `R100` `packages/core/__tests__/workspace/__snapshots__/module-utilities.test.ts.snap` → `pgpm/core/__tests__/workspace/__snapshots__/module-utilities.test.ts.snap`
- [ ] `R100` `packages/core/jest.config.js` → `pgpm/core/jest.config.js`
- [ ] `R100` `packages/core/src/core/boilerplate-scanner.ts` → `pgpm/core/src/core/boilerplate-scanner.ts`
- [ ] `R100` `packages/core/src/core/boilerplate-types.ts` → `pgpm/core/src/core/boilerplate-types.ts`
- [ ] `R100` `packages/core/src/core/template-scaffold.ts` → `pgpm/core/src/core/template-scaffold.ts`
- [ ] `R100` `packages/core/src/export/export-meta.ts` → `pgpm/core/src/export/export-meta.ts`
- [ ] `R100` `packages/core/src/extensions/extensions.ts` → `pgpm/core/src/extensions/extensions.ts`
- [ ] `R100` `packages/core/src/files/extension/index.ts` → `pgpm/core/src/files/extension/index.ts`
- [ ] `R100` `packages/core/src/files/extension/reader.ts` → `pgpm/core/src/files/extension/reader.ts`
- [ ] `R100` `packages/core/src/files/extension/writer.ts` → `pgpm/core/src/files/extension/writer.ts`
- [ ] `R100` `packages/core/src/files/index.ts` → `pgpm/core/src/files/index.ts`
- [ ] `R100` `packages/core/src/files/plan/index.ts` → `pgpm/core/src/files/plan/index.ts`
- [ ] `R100` `packages/core/src/files/plan/parser.ts` → `pgpm/core/src/files/plan/parser.ts`
- [ ] `R100` `packages/core/src/files/plan/validators.ts` → `pgpm/core/src/files/plan/validators.ts`
- [ ] `R100` `packages/core/src/files/sql-scripts/index.ts` → `pgpm/core/src/files/sql-scripts/index.ts`
- [ ] `R100` `packages/core/src/files/sql-scripts/reader.ts` → `pgpm/core/src/files/sql-scripts/reader.ts`
- [ ] `R100` `packages/core/src/files/sql/index.ts` → `pgpm/core/src/files/sql/index.ts`
- [ ] `R100` `packages/core/src/files/sql/writer.ts` → `pgpm/core/src/files/sql/writer.ts`
- [ ] `R100` `packages/core/src/files/types/index.ts` → `pgpm/core/src/files/types/index.ts`
- [ ] `R100` `packages/core/src/files/types/package.ts` → `pgpm/core/src/files/types/package.ts`
- [ ] `R100` `packages/core/src/index.ts` → `pgpm/core/src/index.ts`
- [ ] `R100` `packages/core/src/init/client.ts` → `pgpm/core/src/init/client.ts`
- [ ] `R100` `packages/core/src/init/sql/bootstrap-roles.sql` → `pgpm/core/src/init/sql/bootstrap-roles.sql`
- [ ] `R100` `packages/core/src/init/sql/bootstrap-test-roles.sql` → `pgpm/core/src/init/sql/bootstrap-test-roles.sql`
- [ ] `R100` `packages/core/src/migrate/clean.ts` → `pgpm/core/src/migrate/clean.ts`
- [ ] `R100` `packages/core/src/migrate/index.ts` → `pgpm/core/src/migrate/index.ts`
- [ ] `R100` `packages/core/src/migrate/sql/procedures.sql` → `pgpm/core/src/migrate/sql/procedures.sql`
- [ ] `R100` `packages/core/src/migrate/sql/schema.sql` → `pgpm/core/src/migrate/sql/schema.sql`
- [ ] `R100` `packages/core/src/migrate/types.ts` → `pgpm/core/src/migrate/types.ts`
- [ ] `R100` `packages/core/src/migrate/utils/event-logger.ts` → `pgpm/core/src/migrate/utils/event-logger.ts`
- [ ] `R100` `packages/core/src/migrate/utils/hash.ts` → `pgpm/core/src/migrate/utils/hash.ts`
- [ ] `R100` `packages/core/src/migrate/utils/transaction.ts` → `pgpm/core/src/migrate/utils/transaction.ts`
- [ ] `R100` `packages/core/src/modules/modules.ts` → `pgpm/core/src/modules/modules.ts`
- [ ] `R100` `packages/core/src/packaging/package.ts` → `pgpm/core/src/packaging/package.ts`
- [ ] `R100` `packages/core/src/packaging/transform.ts` → `pgpm/core/src/packaging/transform.ts`
- [ ] `R100` `packages/core/src/resolution/deps.ts` → `pgpm/core/src/resolution/deps.ts`
- [ ] `R100` `packages/core/src/resolution/resolve.ts` → `pgpm/core/src/resolution/resolve.ts`
- [ ] `R100` `packages/core/src/utils/target-utils.ts` → `pgpm/core/src/utils/target-utils.ts`
- [ ] `R100` `packages/core/src/workspace/utils.ts` → `pgpm/core/src/workspace/utils.ts`
- [ ] `R100` `packages/core/test-utils/CoreDeployTestFixture.ts` → `pgpm/core/test-utils/CoreDeployTestFixture.ts`
- [ ] `R100` `packages/core/test-utils/MigrateTestChange.ts` → `pgpm/core/test-utils/MigrateTestChange.ts`
- [ ] `R100` `packages/core/test-utils/MigrateTestFixture.ts` → `pgpm/core/test-utils/MigrateTestFixture.ts`
- [ ] `R100` `packages/core/test-utils/TestDatabase.ts` → `pgpm/core/test-utils/TestDatabase.ts`
- [ ] `R100` `packages/core/test-utils/TestPlan.ts` → `pgpm/core/test-utils/TestPlan.ts`
- [ ] `R100` `packages/core/test-utils/index.ts` → `pgpm/core/test-utils/index.ts`
- [ ] `R100` `packages/core/test-utils/utils/index.ts` → `pgpm/core/test-utils/utils/index.ts`
- [ ] `R100` `packages/core/tsconfig.esm.json` → `pgpm/core/tsconfig.esm.json`
- [ ] `R100` `packages/core/tsconfig.json` → `pgpm/core/tsconfig.json`

</details>

## Renamed / moved (with content changes) (43)
- [ ] `R094` `packages/core/DEPS.md` → `pgpm/core/DEPS.md` (`+4/-4`) — diff: [R094_96a5c9420185.md](../diffs/R094_96a5c9420185.md)
- [ ] `R096` `packages/core/__tests__/config-loading.test.ts` → `pgpm/core/__tests__/config-loading.test.ts` (`+1/-1`) — diff: [R096_3a78d6312c48.md](../diffs/R096_3a78d6312c48.md)
- [ ] `R053` `packages/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap` → `pgpm/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap` (`+17/-16`) — diff: [R053_dd6fedbb2e8a.md](../diffs/R053_dd6fedbb2e8a.md)
- [ ] `R096` `packages/core/__tests__/core/__snapshots__/workspace-extensions-dependency-order.test.ts.snap` → `pgpm/core/__tests__/core/__snapshots__/workspace-extensions-dependency-order.test.ts.snap` (`+1/-1`) — diff: [R096_0f47d0214543.md](../diffs/R096_0f47d0214543.md)
- [ ] `R096` `packages/core/__tests__/core/add-functionality.test.ts` → `pgpm/core/__tests__/core/add-functionality.test.ts` (`+11/-9`) — diff: [R096_477208b0821c.md](../diffs/R096_477208b0821c.md)
- [ ] `R084` `packages/core/__tests__/core/launchql-project.test.ts` → `pgpm/core/__tests__/core/constructive-project.test.ts` (`+13/-13`) — diff: [R084_4bfc794ddeff.md](../diffs/R084_4bfc794ddeff.md)
- [ ] `R079` `packages/core/__tests__/core/module-metadata.test.ts` → `pgpm/core/__tests__/core/module-metadata.test.ts` (`+6/-6`) — diff: [R079_c3cdb788ca7c.md](../diffs/R079_c3cdb788ca7c.md)
- [ ] `R096` `packages/core/__tests__/core/plan-writing.test.ts` → `pgpm/core/__tests__/core/plan-writing.test.ts` (`+1/-1`) — diff: [R096_da834d8cde77.md](../diffs/R096_da834d8cde77.md)
- [ ] `R096` `packages/core/__tests__/core/target-api.test.ts` → `pgpm/core/__tests__/core/target-api.test.ts` (`+4/-4`) — diff: [R096_14f3a484d217.md](../diffs/R096_14f3a484d217.md)
- [ ] `R091` `packages/core/__tests__/core/workspace-extensions-dependency-order.test.ts` → `pgpm/core/__tests__/core/workspace-extensions-dependency-order.test.ts` (`+4/-4`) — diff: [R091_57b133ce2107.md](../diffs/R091_57b133ce2107.md)
- [ ] `R097` `packages/core/__tests__/files/extension/reader.test.ts` → `pgpm/core/__tests__/files/extension/reader.test.ts` (`+1/-1`) — diff: [R097_195138d8cbee.md](../diffs/R097_195138d8cbee.md)
- [ ] `R098` `packages/core/__tests__/files/extension/writer.test.ts` → `pgpm/core/__tests__/files/extension/writer.test.ts` (`+1/-1`) — diff: [R098_3e24454aee51.md](../diffs/R098_3e24454aee51.md)
- [ ] `R057` `packages/core/__tests__/files/plan/__snapshots__/module-plan-generation.test.ts.snap` → `pgpm/core/__tests__/files/plan/__snapshots__/module-plan-generation.test.ts.snap` (`+8/-8`) — diff: [R057_329fe5d77d48.md](../diffs/R057_329fe5d77d48.md)
- [ ] `R054` `packages/core/__tests__/files/plan/__snapshots__/stage-unique-names-plan.test.ts.snap` → `pgpm/core/__tests__/files/plan/__snapshots__/stage-unique-names-plan.test.ts.snap` (`+15/-15`) — diff: [R054_c0b825129654.md](../diffs/R054_c0b825129654.md)
- [ ] `R073` `packages/core/__tests__/files/plan/module-plan-generation.test.ts` → `pgpm/core/__tests__/files/plan/module-plan-generation.test.ts` (`+12/-12`) — diff: [R073_8c967a90f870.md](../diffs/R073_8c967a90f870.md)
- [ ] `R097` `packages/core/__tests__/migrate/tag-fallback.test.ts` → `pgpm/core/__tests__/migrate/tag-fallback.test.ts` (`+1/-1`) — diff: [R097_ca5451878ad7.md](../diffs/R097_ca5451878ad7.md)
- [ ] `R089` `packages/core/__tests__/modules/__snapshots__/module-installation.test.ts.snap` → `pgpm/core/__tests__/modules/__snapshots__/module-installation.test.ts.snap` (`+3/-3`) — diff: [R089_f827260d9159.md](../diffs/R089_f827260d9159.md)
- [ ] `R084` `packages/core/__tests__/modules/module-installation.test.ts` → `pgpm/core/__tests__/modules/module-installation.test.ts` (`+4/-4`) — diff: [R084_34f3e1695844.md](../diffs/R084_34f3e1695844.md)
- [ ] `R088` `packages/core/__tests__/modules/module-packaging.test.ts` → `pgpm/core/__tests__/modules/module-packaging.test.ts` (`+1/-1`) — diff: [R088_23fae48e2d84.md](../diffs/R088_23fae48e2d84.md)
- [ ] `R095` `packages/core/__tests__/projects/DEPLOYMENT_FAILURE_ANALYSIS.md` → `pgpm/core/__tests__/projects/DEPLOYMENT_FAILURE_ANALYSIS.md` (`+2/-2`) — diff: [R095_004eed484e04.md](../diffs/R095_004eed484e04.md)
- [ ] `R096` `packages/core/__tests__/projects/deploy-log-only.test.ts` → `pgpm/core/__tests__/projects/deploy-log-only.test.ts` (`+1/-1`) — diff: [R096_fba77e6af677.md](../diffs/R096_fba77e6af677.md)
- [ ] `R097` `packages/core/__tests__/projects/deployment-scenarios.test.ts` → `pgpm/core/__tests__/projects/deployment-scenarios.test.ts` (`+1/-1`) — diff: [R097_29797ac31ae7.md](../diffs/R097_29797ac31ae7.md)
- [ ] `R096` `packages/core/__tests__/projects/dynamic-plan-modification.test.ts` → `pgpm/core/__tests__/projects/dynamic-plan-modification.test.ts` (`+1/-1`) — diff: [R096_9d33181828f0.md](../diffs/R096_9d33181828f0.md)
- [ ] `R097` `packages/core/__tests__/projects/forked-deployment-scenarios.test.ts` → `pgpm/core/__tests__/projects/forked-deployment-scenarios.test.ts` (`+3/-1`) — diff: [R097_2bdc4f44d277.md](../diffs/R097_2bdc4f44d277.md)
- [ ] `R099` `packages/core/__tests__/projects/revert-truncation-scenarios.test.ts` → `pgpm/core/__tests__/projects/revert-truncation-scenarios.test.ts` (`+1/-1`) — diff: [R099_6b73c0fba65e.md](../diffs/R099_6b73c0fba65e.md)
- [ ] `R099` `packages/core/__tests__/projects/stage-workspace.test.ts` → `pgpm/core/__tests__/projects/stage-workspace.test.ts` (`+1/-1`) — diff: [R099_1d8f4367ebc8.md](../diffs/R099_1d8f4367ebc8.md)
- [ ] `R098` `packages/core/__tests__/projects/tag-functionality.test.ts` → `pgpm/core/__tests__/projects/tag-functionality.test.ts` (`+1/-1`) — diff: [R098_e4af97296ad6.md](../diffs/R098_e4af97296ad6.md)
- [ ] `R080` `packages/core/__tests__/resolution/__snapshots__/dependency-resolution-error-handling.test.ts.snap` → `pgpm/core/__tests__/resolution/__snapshots__/dependency-resolution-error-handling.test.ts.snap` (`+1/-1`) — diff: [R080_c09609f903d7.md](../diffs/R080_c09609f903d7.md)
- [ ] `R091` `packages/core/__tests__/resolution/dependency-resolution-basic.test.ts` → `pgpm/core/__tests__/resolution/dependency-resolution-basic.test.ts` (`+3/-3`) — diff: [R091_4e81404981d0.md](../diffs/R091_4e81404981d0.md)
- [ ] `R089` `packages/core/__tests__/resolution/dependency-resolution-error-handling.test.ts` → `pgpm/core/__tests__/resolution/dependency-resolution-error-handling.test.ts` (`+1/-1`) — diff: [R089_8d48b9952351.md](../diffs/R089_8d48b9952351.md)
- [ ] `R096` `packages/core/__tests__/workspace/module-utilities.test.ts` → `pgpm/core/__tests__/workspace/module-utilities.test.ts` (`+1/-1`) — diff: [R096_7e5068157568.md](../diffs/R096_7e5068157568.md)
- [ ] `R098` `packages/core/package.json` → `pgpm/core/package.json` (`+1/-1`) — diff: [R098_e89810cf12b2.md](../diffs/R098_e89810cf12b2.md)
- [ ] `R099` `packages/core/src/core/class/pgpm.ts` → `pgpm/core/src/core/class/pgpm.ts` (`+6/-6`) — diff: [R099_9fb9124f1ca2.md](../diffs/R099_9fb9124f1ca2.md)
- [ ] `R098` `packages/core/src/export/export-migrations.ts` → `pgpm/core/src/export/export-migrations.ts` (`+1/-1`) — diff: [R098_3f5c012232ba.md](../diffs/R098_3f5c012232ba.md)
- [ ] `R088` `packages/core/src/files/plan/generator.ts` → `pgpm/core/src/files/plan/generator.ts` (`+3/-3`) — diff: [R088_4a8827582464.md](../diffs/R088_4a8827582464.md)
- [ ] `R096` `packages/core/src/files/plan/writer.ts` → `pgpm/core/src/files/plan/writer.ts` (`+3/-3`) — diff: [R096_89d4634a5139.md](../diffs/R096_89d4634a5139.md)
- [ ] `R099` `packages/core/src/migrate/client.ts` → `pgpm/core/src/migrate/client.ts` (`+1/-1`) — diff: [R099_b93bea3f372f.md](../diffs/R099_b93bea3f372f.md)
- [ ] `R098` `packages/core/src/projects/deploy.ts` → `pgpm/core/src/projects/deploy.ts` (`+1/-1`) — diff: [R098_7fc7ce054c8b.md](../diffs/R098_7fc7ce054c8b.md)
- [ ] `R097` `packages/core/src/projects/revert.ts` → `pgpm/core/src/projects/revert.ts` (`+1/-1`) — diff: [R097_63eb403c0218.md](../diffs/R097_63eb403c0218.md)
- [ ] `R097` `packages/core/src/projects/verify.ts` → `pgpm/core/src/projects/verify.ts` (`+1/-1`) — diff: [R097_8fd3cfaf896a.md](../diffs/R097_8fd3cfaf896a.md)
- [ ] `R081` `packages/core/src/utils/debug.ts` → `pgpm/core/src/utils/debug.ts` (`+14/-14`) — diff: [R081_dad717e19c32.md](../diffs/R081_dad717e19c32.md)
- [ ] `R064` `packages/core/src/workspace/paths.ts` → `pgpm/core/src/workspace/paths.ts` (`+7/-7`) — diff: [R064_4fb71edaeb57.md](../diffs/R064_4fb71edaeb57.md)
- [ ] `R093` `packages/core/test-utils/TestFixture.ts` → `pgpm/core/test-utils/TestFixture.ts` (`+2/-2`) — diff: [R093_14e4d157f834.md](../diffs/R093_14e4d157f834.md)

## Added (2)
- [ ] `A` `pgpm/core/AGENTS.md` — content: [A_aec4c14d1274.md](../diffs/A_aec4c14d1274.md)
- [ ] `A` `pgpm/core/__tests__/core/__snapshots__/plan-writing.test.ts.snap` — content: [A_ba7ad044fe2c.md](../diffs/A_ba7ad044fe2c.md)

## Deleted (2)
- [ ] `D` `packages/core/AGENTS.md` — content: [D_1047abaf1c7b.md](../diffs/D_1047abaf1c7b.md)
- [ ] `D` `packages/core/__tests__/core/__snapshots__/plan-writing.test.ts.snap` — content: [D_60d8d90811f6.md](../diffs/D_60d8d90811f6.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' pgpm/core`
- [ ] `rg -n '@launchql/' pgpm/core`
