# Project Scaffolding with pgpm init

Scaffold new Constructive projects using `pgpm init` — workspace/module templates (PGPM and PNPM variants), Next.js app boilerplate, custom template repositories, and boilerplate authoring.

## When to Apply

Use this reference when:
- Scaffolding a new workspace or module with `pgpm init`
- Setting up a Constructive Next.js frontend application
- Using custom template repositories
- Authoring new boilerplate templates
- Setting up non-interactive `pgpm init` for CI/CD

## Quick Start

```bash
# Create a PGPM workspace + module
pgpm init -w

# Create a Next.js app from template
pgpm init -w --repo constructive-io/sandbox-templates --template nextjs/constructive-app

# Create a pure TypeScript workspace
pgpm init workspace --dir pnpm
```

## Available Templates

| Template | Command | Description |
|----------|---------|-------------|
| PGPM workspace | `pgpm init workspace` | Monorepo with pgpm.json, migrations support |
| PGPM module | `pgpm init` | Database module with pgpm.plan, .control file |
| PNPM workspace | `pgpm init workspace --dir pnpm` | Pure PNPM workspace (no pgpm files) |
| PNPM module | `pgpm init --dir pnpm` | Pure TypeScript package |
| Next.js App | `pgpm init -w --repo constructive-io/sandbox-templates -t nextjs/constructive-app` | Full-stack Constructive frontend |

## CLI Options

| Option | Description |
|--------|-------------|
| `--repo <repo>` | Template repository (default: constructive-io/pgpm-boilerplates) |
| `--from-branch <branch>` | Branch/tag to use when cloning repo |
| `--dir <variant>` | Template variant directory (e.g., pnpm, supabase) |
| `--template, -t <path>` | Full template path (e.g., pnpm/module) — combines dir and type |
| `--boilerplate` | Prompt to select from available boilerplates |
| `--create-workspace, -w` | Create a workspace first, then create the module inside it |
| `--no-tty` | Run in non-interactive mode |

## Non-Interactive Mode

For CI/CD pipelines and automation, use `--no-tty` or set `CI=true`. In this
mode nothing prompts: every required template question must be answered by a
CLI flag or a resolvable default, otherwise the command errors out.

```bash
pgpm init workspace --no-tty \
  --name my-workspace \
  --fullName "Your Name" \
  --email "you@example.com" \
  --username your-github-username \
  --repoName my-workspace \
  --license MIT
```

### Required Parameters for Non-Interactive Workspace

| Parameter | Description | Default when omitted |
|-----------|-------------|----------------------|
| `--name` | Workspace name (directory to create) | none — always required |
| `--fullName` | Author's full name | `git config user.name` |
| `--email` | Author's email | `git config user.email` |
| `--repoName` | Repository name | workspace directory name |
| `--username` | GitHub username | `npm whoami` |
| `--license` | License (e.g., MIT) | none — always required |

Defaults come from resolvers (git config, npm login, workspace dir name). On a
machine without a git identity or npm login, pass `--fullName`, `--email`, and
`--username` explicitly.

### Required Parameters for Non-Interactive Module

| Parameter | Description |
|-----------|-------------|
| `--moduleName` | Module name |
| `--moduleDesc` | Module description |
| `--fullName` | Author's full name |
| `--email` | Author's email |
| `--username` | GitHub username |
| `--repoName` | Repository name |
| `--license` | License |
| `--access` | npm access level (public/restricted) |
| `--extensions` | PostgreSQL extensions (comma-separated) |

## Detailed References

- [template-authoring.md](template-authoring.md) — Creating custom boilerplate templates
- [nextjs-app.md](nextjs-app.md) — Constructive Next.js app boilerplate
