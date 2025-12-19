# PGPM Core Package - Agent Guide

The `@pgpmjs/core` package is the migration, packaging, and dependency-resolution engine used by:

- the `pgpm` CLI (`pgpm/pgpm`)
- the Constructive CLI (`@constructive-io/cli`, which delegates most database commands to `pgpm`)

It provides workspace/module discovery, plan parsing/writing, deployment orchestration, and a low-level migration client.

## Key Concepts

- **Workspace:** Identified by `pgpm.json` or `pgpm.config.js`
- **Module:** Identified by `pgpm.plan` (and typically a Postgres extension `.control` file)
- **Plans:** Sqitch-compatible plan files (`pgpm.plan`) drive ordering, dependencies, and tags

## Primary Entry Points

- **Exports:** `pgpm/core/src/index.ts`
- **High-level orchestration:** `pgpm/core/src/core/class/pgpm.ts` (`PgpmPackage`)
- **Low-level migrations:** `pgpm/core/src/migrate/client.ts` (`PgpmMigrate`)
- **Scaffolding:** `pgpm/core/src/init/client.ts` (`PgpmInit`)

## Files Worth Knowing

- `pgpm/core/src/workspace/paths.ts` – locate workspace/module roots
- `pgpm/core/src/files/plan/*` – plan parsing/generation/writing
- `pgpm/core/src/resolution/deps.ts` – dependency resolution (SQL headers vs plan-driven)
- `pgpm/core/src/packaging/package.ts` – build consolidated SQL package output
- `pgpm/core/src/projects/*` – deploy/revert/verify orchestration helpers

## Typical Module Layout

```
my-module/
├── pgpm.plan
├── my-module.control
├── Makefile
├── deploy/
├── revert/
└── verify/
```

## Common Workflows (via CLI)

Most users hit this via the CLI layer:

- `pgpm init workspace` / `constructive init workspace`
- `pgpm init` / `constructive init`
- `pgpm add <change>` / `constructive add <change>`
- `pgpm deploy` / `constructive deploy`
- `pgpm verify` / `constructive verify`
- `pgpm revert` / `constructive revert`

CLI implementations live in `pgpm/pgpm/src/commands/*`.
