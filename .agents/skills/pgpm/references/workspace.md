
# PGPM Workspaces

Create and manage pgpm workspaces for modular PostgreSQL development. Workspaces bring npm-style modularity to database development.

## When to Apply

Use this skill when:
- Starting a new modular database project
- Creating a pgpm workspace structure
- Initializing database modules
- Setting up a pnpm monorepo for database packages

## Quick Start

### Create a Workspace

```bash
pgpm init workspace
```

Enter workspace name when prompted:
```sh
? Enter workspace name: my-database-project
```

This creates a complete pnpm monorepo:
```text
my-database-project/
├── docker-compose.yml
├── pgpm.json
├── lerna.json
├── LICENSE
├── Makefile
├── package.json
├── packages/
├── pnpm-workspace.yaml
├── README.md
└── tsconfig.json
```

### Install Dependencies

```bash
cd my-database-project
pnpm install
```

### Create a Module

Inside the workspace:
```bash
pgpm init
```

Enter the module name:
```sh
? Enter module name: pets
```

Modules scaffold with no extensions by default. Add them later with `pgpm extension --add <ext>`, or up front with `pgpm init --extensions <a,b>`.

This creates:
```text
packages/pets/
├── pets.control
├── pgpm.plan
├── deploy/
├── revert/
└── verify/
```

## Workspace vs Module

**Workspace**: Top-level directory containing your entire project. Has `pgpm.json` and `packages/` directory. Like an npm project root.

**Module**: Self-contained database package inside the workspace. Has its own `pgpm.plan`, `.control` file, and migration directories. Like an individual npm package.

## Key Files

### pgpm.json (Workspace Config)

```json
{
  "packages": ["packages/*"]
}
```

Points pgpm to your modules directory.

### module.control (Module Metadata)

```sh
# pets.control
comment = 'Pet adoption module'
default_version = '0.0.1'
requires = 'pgcrypto'
```

Declares module name, description, version, and dependencies. A freshly-scaffolded module has no `requires` line until you add a dependency.

### pgpm.plan (Migration Plan)

```sh
%syntax-version=1.0.0
%project=pets
%uri=pets

schemas/pets 2025-11-14T00:00:00Z Author <author@example.com>
schemas/pets/tables/pets [schemas/pets] 2025-11-14T00:00:00Z Author <author@example.com>
```

Tracks all changes in deployment order.

## Common Commands

| Command | Description |
|---------|-------------|
| `pgpm init workspace` | Create new workspace |
| `pgpm init` | Create new module in workspace |
| `pgpm add <change>` | Add a database change |
| `pgpm deploy` | Deploy module to database |
| `pgpm verify` | Verify deployment |
| `pgpm revert` | Rollback changes |

## Environment Setup

Before deploying, ensure PostgreSQL is running and connection variables are loaded.

> See `references/docker.md` for starting PostgreSQL and `references/env.md` for loading environment variables.

```bash
# Verify connection
psql -c "SELECT version();"

# Bootstrap database users (run once)
pgpm admin-users bootstrap --yes
```

## Deploy a Module

```bash
cd packages/pets
pgpm deploy --database pets_dev --createdb --yes
```

pgpm:
1. Creates the database if needed
2. Resolves dependencies
3. Deploys changes in order
4. Tracks deployment in `pgpm_migrate` schema

## Module Structure Best Practices

Organize changes hierarchically:
```text
deploy/
└── schemas/
    └── app/
        ├── schema.sql
        ├── tables/
        │   └── users.sql
        ├── functions/
        │   └── create_user.sql
        └── triggers/
            └── updated_at.sql
```

Use nested paths:
```bash
pgpm add schemas/app/schema
pgpm add schemas/app/tables/users --requires schemas/app/schema
pgpm add schemas/app/functions/create_user --requires schemas/app/tables/users
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to Docker" | Start Docker Desktop first |
| "PGHOST not set" | Load PG env vars (see `references/env.md`) |
| "Connection refused" | Ensure PostgreSQL is running (see `references/docker.md`) |
| Module not found | Ensure you're inside a workspace with `pgpm.json` |

## References

- Related reference: `references/docker.md` for Docker management
- Related reference: `references/env.md` for environment configuration
- Related reference: `references/changes.md` for authoring database changes
