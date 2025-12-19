# Review checklist — `packages/pgpm`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/pgpm` → `pgpm/pgpm`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `pgpm`

## Renamed / moved (no content changes) (51)
<details>
<summary>Show 51 rename-only paths</summary>

- [ ] `R100` `packages/pgpm/CHANGELOG.md` → `pgpm/pgpm/CHANGELOG.md`
- [ ] `R100` `packages/pgpm/README.md` → `pgpm/pgpm/README.md`
- [ ] `R100` `packages/pgpm/jest.config.js` → `pgpm/pgpm/jest.config.js`
- [ ] `R100` `packages/pgpm/src/__tests__/npm-version.test.ts` → `pgpm/pgpm/src/__tests__/npm-version.test.ts`
- [ ] `R100` `packages/pgpm/src/__tests__/update-check.test.ts` → `pgpm/pgpm/src/__tests__/update-check.test.ts`
- [ ] `R100` `packages/pgpm/src/__tests__/update-command.test.ts` → `pgpm/pgpm/src/__tests__/update-command.test.ts`
- [ ] `R100` `packages/pgpm/src/__tests__/update-config.test.ts` → `pgpm/pgpm/src/__tests__/update-config.test.ts`
- [ ] `R100` `packages/pgpm/src/commands.ts` → `pgpm/pgpm/src/commands.ts`
- [ ] `R100` `packages/pgpm/src/commands/add.ts` → `pgpm/pgpm/src/commands/add.ts`
- [ ] `R100` `packages/pgpm/src/commands/admin-users.ts` → `pgpm/pgpm/src/commands/admin-users.ts`
- [ ] `R100` `packages/pgpm/src/commands/admin-users/add.ts` → `pgpm/pgpm/src/commands/admin-users/add.ts`
- [ ] `R100` `packages/pgpm/src/commands/admin-users/bootstrap.ts` → `pgpm/pgpm/src/commands/admin-users/bootstrap.ts`
- [ ] `R100` `packages/pgpm/src/commands/admin-users/remove.ts` → `pgpm/pgpm/src/commands/admin-users/remove.ts`
- [ ] `R100` `packages/pgpm/src/commands/analyze.ts` → `pgpm/pgpm/src/commands/analyze.ts`
- [ ] `R100` `packages/pgpm/src/commands/cache.ts` → `pgpm/pgpm/src/commands/cache.ts`
- [ ] `R100` `packages/pgpm/src/commands/clear.ts` → `pgpm/pgpm/src/commands/clear.ts`
- [ ] `R100` `packages/pgpm/src/commands/deploy.ts` → `pgpm/pgpm/src/commands/deploy.ts`
- [ ] `R100` `packages/pgpm/src/commands/docker.ts` → `pgpm/pgpm/src/commands/docker.ts`
- [ ] `R100` `packages/pgpm/src/commands/export.ts` → `pgpm/pgpm/src/commands/export.ts`
- [ ] `R100` `packages/pgpm/src/commands/extension.ts` → `pgpm/pgpm/src/commands/extension.ts`
- [ ] `R100` `packages/pgpm/src/commands/init/index.ts` → `pgpm/pgpm/src/commands/init/index.ts`
- [ ] `R100` `packages/pgpm/src/commands/init/module.ts` → `pgpm/pgpm/src/commands/init/module.ts`
- [ ] `R100` `packages/pgpm/src/commands/init/workspace.ts` → `pgpm/pgpm/src/commands/init/workspace.ts`
- [ ] `R100` `packages/pgpm/src/commands/install.ts` → `pgpm/pgpm/src/commands/install.ts`
- [ ] `R100` `packages/pgpm/src/commands/kill.ts` → `pgpm/pgpm/src/commands/kill.ts`
- [ ] `R100` `packages/pgpm/src/commands/migrate/deps.ts` → `pgpm/pgpm/src/commands/migrate/deps.ts`
- [ ] `R100` `packages/pgpm/src/commands/migrate/init.ts` → `pgpm/pgpm/src/commands/migrate/init.ts`
- [ ] `R100` `packages/pgpm/src/commands/migrate/list.ts` → `pgpm/pgpm/src/commands/migrate/list.ts`
- [ ] `R100` `packages/pgpm/src/commands/migrate/status.ts` → `pgpm/pgpm/src/commands/migrate/status.ts`
- [ ] `R100` `packages/pgpm/src/commands/package.ts` → `pgpm/pgpm/src/commands/package.ts`
- [ ] `R100` `packages/pgpm/src/commands/plan.ts` → `pgpm/pgpm/src/commands/plan.ts`
- [ ] `R100` `packages/pgpm/src/commands/remove.ts` → `pgpm/pgpm/src/commands/remove.ts`
- [ ] `R100` `packages/pgpm/src/commands/rename.ts` → `pgpm/pgpm/src/commands/rename.ts`
- [ ] `R100` `packages/pgpm/src/commands/revert.ts` → `pgpm/pgpm/src/commands/revert.ts`
- [ ] `R100` `packages/pgpm/src/commands/tag.ts` → `pgpm/pgpm/src/commands/tag.ts`
- [ ] `R100` `packages/pgpm/src/commands/update.ts` → `pgpm/pgpm/src/commands/update.ts`
- [ ] `R100` `packages/pgpm/src/commands/verify.ts` → `pgpm/pgpm/src/commands/verify.ts`
- [ ] `R100` `packages/pgpm/src/index.ts` → `pgpm/pgpm/src/index.ts`
- [ ] `R100` `packages/pgpm/src/utils/argv.ts` → `pgpm/pgpm/src/utils/argv.ts`
- [ ] `R100` `packages/pgpm/src/utils/cli-error.ts` → `pgpm/pgpm/src/utils/cli-error.ts`
- [ ] `R100` `packages/pgpm/src/utils/database.ts` → `pgpm/pgpm/src/utils/database.ts`
- [ ] `R100` `packages/pgpm/src/utils/deployed-changes.ts` → `pgpm/pgpm/src/utils/deployed-changes.ts`
- [ ] `R100` `packages/pgpm/src/utils/display.ts` → `pgpm/pgpm/src/utils/display.ts`
- [ ] `R100` `packages/pgpm/src/utils/index.ts` → `pgpm/pgpm/src/utils/index.ts`
- [ ] `R100` `packages/pgpm/src/utils/module-utils.ts` → `pgpm/pgpm/src/utils/module-utils.ts`
- [ ] `R100` `packages/pgpm/src/utils/npm-version.ts` → `pgpm/pgpm/src/utils/npm-version.ts`
- [ ] `R100` `packages/pgpm/src/utils/package-alias.ts` → `pgpm/pgpm/src/utils/package-alias.ts`
- [ ] `R100` `packages/pgpm/src/utils/update-check.ts` → `pgpm/pgpm/src/utils/update-check.ts`
- [ ] `R100` `packages/pgpm/src/utils/update-config.ts` → `pgpm/pgpm/src/utils/update-config.ts`
- [ ] `R100` `packages/pgpm/tsconfig.esm.json` → `pgpm/pgpm/tsconfig.esm.json`
- [ ] `R100` `packages/pgpm/tsconfig.json` → `pgpm/pgpm/tsconfig.json`

</details>

## Renamed / moved (with content changes) (3)
- [ ] `R098` `packages/pgpm/package.json` → `pgpm/pgpm/package.json` (`+1/-1`) — diff: [R098_3fb3fa9c134a.md](../diffs/R098_3fb3fa9c134a.md)
- [ ] `R096` `packages/pgpm/src/commands/env.ts` → `pgpm/pgpm/src/commands/env.ts` (`+2/-2`) — diff: [R096_a3f7ee3f992f.md](../diffs/R096_a3f7ee3f992f.md)
- [ ] `R088` `packages/pgpm/src/commands/migrate.ts` → `pgpm/pgpm/src/commands/migrate.ts` (`+5/-5`) — diff: [R088_f2a34ceef126.md](../diffs/R088_f2a34ceef126.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' pgpm/pgpm`
- [ ] `rg -n '@launchql/' pgpm/pgpm`
