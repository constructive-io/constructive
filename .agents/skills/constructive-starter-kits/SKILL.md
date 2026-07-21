---
name: constructive-starter-kits
description: Scaffold new Constructive projects with pgpm init — workspace/module templates (PGPM and PNPM variants), the Next.js app boilerplate, custom template repositories, and boilerplate authoring. Use when asked to "create a new project", "scaffold a workspace", "scaffold a module", "create a starter kit", "start a boilerplate", "set up a Next.js app", "author a custom boilerplate template", "create a template repository", or "run pgpm init non-interactively in CI".
compatibility: pgpm CLI, Node.js 22+
metadata:
  author: constructive-io
  version: "1.0.0"
---

# Constructive Starter Kits

Project scaffolding for Constructive, powered by `pgpm init` — create workspaces, modules, and full-stack apps from boilerplate templates, and author your own templates.

This is a **thin router**. The authoritative content lives in the `pgpm` skill's project-scaffolding references (single source of truth — this skill only makes it discoverable under starter-kit/boilerplate/scaffold trigger phrases). Read the reference matching your task.

## When to Apply

Use this skill when:
- Scaffolding a new workspace or module with `pgpm init`
- Setting up a Constructive Next.js frontend application
- Using custom template repositories (`--repo` / `--template`)
- Authoring new boilerplate templates (`.boilerplate.json`)
- Running non-interactive `pgpm init` for CI/CD

## Quick Start

```bash
# Create a PGPM workspace + module
pgpm init -w

# Create a Next.js app from template
pgpm init -w --repo constructive-io/sandbox-templates --template nextjs/constructive-app

# Create a pure TypeScript (PNPM) workspace
pgpm init workspace --dir pnpm
```

## Reference Guide

All detailed content lives in the `pgpm` skill's references:

| Reference | Topic | Consult When |
|-----------|-------|--------------|
| [../pgpm/references/starter-kits.md](../pgpm/references/starter-kits.md) | `pgpm init` templates and scaffolding | Creating new workspaces, modules, or Next.js apps; template matrix; non-interactive flags |
| [../pgpm/references/nextjs-app.md](../pgpm/references/nextjs-app.md) | Constructive Next.js app boilerplate | Setting up the frontend app, project structure, auth flows, SDK generation |
| [../pgpm/references/template-authoring.md](../pgpm/references/template-authoring.md) | Custom boilerplate authoring | Creating `.boilerplate.json`, placeholder system, question config, resolvers |
| [../pgpm/references/cli.md](../pgpm/references/cli.md) | Full `pgpm init` flag reference | Looking up every init flag and option |
| [../pgpm/references/workspace.md](../pgpm/references/workspace.md) | Workspace/module structure | Understanding what a scaffolded workspace/module contains |

## Cross-References

Related skills:
- `pgpm` — Database migrations and module management (what you do after scaffolding); owns the references above
- `constructive-cli` — Generated CLI commands and scaffolding
- `constructive-setup` — Monorepo setup and local development environment
