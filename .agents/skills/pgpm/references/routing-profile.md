# Routing Profile & Module Self-Description

How pgpm separates *what a module is* from *where a consumer puts it*. Two surfaces, no more:

1. **Self-description (intrinsic, per module)** — the module states facts about itself:
   `.control` `requires` (dependency ordering) + an `extensions.json` manifest
   (`provides`/`consumes`: where an extension it wraps installs, or which symbols it uses).
2. **Routing profile (extrinsic, consumer policy)** — one shared shape
   (`PgpmRoutingProfile`: `schemas`, `route`, `extensions`, `roles`) attachable at two scopes:
   the workspace (`portability` in `pgpm.json`) and per import (a proxy module's
   `pgpm.apply.json`).

Key rule: consumers never hard-code where an extension lives. The module that *provides*
an extension declares its default schema/grants; consumers only declare the symbols they
consume, and the transform resolves symbol qualification to wherever the provider landed.

## Surface 1: module self-description

### `.control` `requires`

Names extension/module dependencies (control names). Ordering only — it cannot say *where*
or *with which grants*.

### `extensions.json` (or `pgpm.extensions.json`)

Sits next to `pgpm.plan`. Two keys:

- `provides` — this module *is* the wrapper for an extension: it declares the install
  schema and grants. Replaces dynamic `CREATE EXTENSION ... SCHEMA x` hacks.
- `consumes` — this module merely *uses* symbols from an extension installed elsewhere
  and needs them qualified to wherever it actually landed.

```json
{
  "provides": {
    "pgcrypto": {
      "schema": "extensions",
      "grants": [
        { "privileges": "USAGE", "on": "schema", "to": ["authenticated"] }
      ]
    }
  },
  "consumes": {
    "pgcrypto": { "symbols": ["crypt", "gen_salt"] }
  }
}
```

## Surface 2: the routing profile

One TypeScript shape, `PgpmRoutingProfile` (`@pgpmjs/types`), driven by
`@pgsql/transform`'s SchemaRouter/ExtensionRouter/RoleRouter:

| Key | Meaning |
|-----|---------|
| `schemas` | Whole-schema default: source schema → target schema |
| `route` | Object-level overrides: `{ fromSchema, kind, name, toSchema }[]` |
| `extensions` | Extension-symbol routing: `{ toSchema \| routes, only?, from? }` |
| `roles` | Role-name translation: source role → target role |

### Attach point A — workspace scope: `portability` in `pgpm.json`

The default for every apply/transpile in the workspace:

```json
{
  "packages": ["packages/*"],
  "portability": {
    "extensions": { "toSchema": "extensions" },
    "roles": { "anonymous": "anon", "administrator": "service_role" }
  }
}
```

### Attach point B — per-import scope: `pgpm.apply.json`

A proxy module's apply spec carries the same routing keys plus its `source`:

```json
{
  "source": "secure-module",
  "schemas": { "vault": "vault_a" },
  "roles": { "anonymous": "anon_a" }
}
```

### Precedence: defaults → workspace `portability` → apply spec

Merged **per key** (inner scope wins, like lexical scoping): a proxy that only overrides
`roles` still inherits the workspace `extensions` mapping. An overriding key replaces the
whole value — there is no deep merge within a key.

Everything is additive and backward compatible: with no workspace profile, apply specs
behave exactly as before; a proxy must still declare at least one routing key of its own.

## Where it lives in code

- `PgpmRoutingProfile`, `mergeRoutingProfiles` — `pgpm/types/src/routing.ts`
- Workspace attach point — `PgpmWorkspaceConfig.portability` (`pgpm/types/src/pgpm.ts`)
- Loading + spec merge — `pgpm/core/src/apply/profile.ts`
  (`loadWorkspaceRoutingProfile`, `resolveEffectiveApplySpec`)
- Apply spec parsing — `pgpm/core/src/apply/apply-spec.ts`
- Extensions manifest — `pgpm/core/src/extensions/manifest.ts`
