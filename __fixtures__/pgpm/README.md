# Ephemeral pgpm Fixtures Workspace

A minimal pgpm workspace whose `extensions/` directory is **gitignored** and
populated on demand from the published `@pgpm/*` modules on npm. Integration
tests deploy these real modules (via `seed.pgpm(...)`) instead of hand-written
copies of production DDL, so fixtures can never drift from `constructive-db`.

## Usage

```bash
pnpm build                    # pgpm CLI must be built first
pnpm fixtures:install         # install pinned versions from workspace/pgpm.json
pnpm fixtures:install:force   # reinstall even if already present
```

Then, in tests:

```typescript
const pgpmWorkspace = path.resolve(__dirname, '../../../__fixtures__/pgpm/workspace');

await getConnections(options, [
  seed.pgpm(pgpmWorkspace),  // deploys all installed modules (dependency-ordered)
  seed.sqlfile([/* grants, app schemas, test data */])
]);
```

`seed.pgpm` accepts either a module directory (deploys that module + its
dependencies) or a workspace root (deploys every installed module once, in
dependency order).

## Pinning and upgrading

Versions are pinned in `workspace/pgpm.json` under `dependencies`, keeping CI
deterministic. To upgrade:

```bash
node pgpm/cli/dist/index.js install @pgpm/metaschema-modules@latest --cwd __fixtures__/pgpm/workspace
```

This installs the latest published version and records it back into
`pgpm.json` — the version bump is the only diff to review.

## Cross-repo development

To test against unpublished module changes from a local `constructive-db`
checkout, copy (or symlink) the module directories into
`workspace/extensions/@pgpm/` after running `fixtures:install` — the
directory is gitignored, so local overrides never leak into commits.
