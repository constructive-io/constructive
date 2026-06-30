---
name: constructive-principals
description: "Principal identity system at the application layer — ORM, CLI, and hooks usage for creating/managing principals (scoped sub-identities). Covers the dual-claim JWT model, principal lifecycle via SDK, org scoping with principal_entities, and AuthzHumanOnly enforcement. Use when asked to 'create a principal', 'manage API agents', 'scope an API key', 'use principals', or when building principal management features."
metadata:
  author: constructive-io
  version: "1.0.0"
  triggers: "user, model"
---

# Principals — Application Layer

Principals are scoped sub-identities (user type=3) that authenticate via API keys with a subset of their parent human's permissions. This skill covers how to use principals from the ORM, CLI, and React hooks.

For SQL-level internals, see the `constructive-db-principals` skill in the `constructive-db` repo.

## When to Apply

Use this skill when:
- Creating or deleting principals via ORM, CLI, or hooks
- Building UI for principal management
- Scoping a principal to specific orgs via `principal_entities`
- Understanding the dual-claim JWT model at the application layer

## Core Concepts

### Dual-Claim JWT Model

Two JWT claims are always present. For normal human sessions, both are identical:

| Claim | Resolves To | Application Use |
|-------|-------------|-----------------|
| `jwt.claims.user_id` | Always the human | Billing, ownership, peoplestamps |
| `jwt.claims.principal_id` | The principal (or same as user_id for humans) | SPRT permission lookups |

When authenticating with a principal's API key, `user_id` stays the human owner and `principal_id` becomes the principal's identity. All existing ownership checks (`created_by`, `updated_by`, billing) continue to attribute to the human.

### User Types

```
1 = User (human)
2 = Organization
3 = Principal (scoped sub-identity)
```

### AuthzHumanOnly

All principal management mutations (`create_principal`, `delete_principal`) are guarded by `AuthzHumanOnly` — only the owning human can call them. A principal session cannot create or delete other principals.

### Org Scoping

Principals can be restricted to specific orgs via `principal_entities`:
- **No entries** = unrestricted (inherits access to all parent's orgs)
- **1+ entries** = restricted to only those specific orgs

## ORM Usage

### Create a principal

```typescript
const result = await db.createPrincipal({
  data: {
    name: 'billing-bot',
    allowedMask: null,       // null = inherit all parent permissions
    isReadOnly: false,
    bypassStepUp: true,
    entityIds: null           // null = unrestricted org access
  },
  select: {
    id: true,
    userId: true,
    name: true,
    ownerIdId: true
  }
}).execute();

const principal = result.unwrap();
```

### Create a principal scoped to specific orgs

```typescript
const result = await db.createPrincipal({
  data: {
    name: 'org-a-only-bot',
    allowedMask: null,
    isReadOnly: true,
    bypassStepUp: true,
    entityIds: [orgAId, orgBId]  // restrict to these orgs
  },
  select: { id: true, name: true }
}).execute();
```

### Delete a principal

```typescript
const result = await db.deletePrincipal({
  data: {
    principalId: principalId
  },
  select: { success: true }
}).execute();
```

### Query principals (owner sees own only)

```typescript
const principals = await db.principal.findMany({
  select: {
    id: true,
    name: true,
    userId: true,
    allowedMask: true,
    isReadOnly: true,
    bypassStepUp: true
  }
}).execute();
```

### Query principal entity scoping

```typescript
const scoping = await db.principalEntity.findMany({
  where: { principalId: principalId },
  select: {
    id: true,
    principalId: true,
    entityId: true
  }
}).execute();
```

## CLI Usage

### Create a principal

```bash
csdk create-principal \
  --name "ci-deploy" \
  --is-read-only false \
  --bypass-step-up true
```

### Create with org scoping

```bash
csdk create-principal \
  --name "org-scoped-bot" \
  --entity-ids "<org-uuid-1>,<org-uuid-2>" \
  --is-read-only true
```

### Delete a principal

```bash
csdk delete-principal --principal-id "<principal-uuid>"
```

### List principals

```bash
csdk principal list
```

### List principal entities (org scoping)

```bash
csdk principal-entity list --principal-id "<principal-uuid>"
```

## React Hooks Usage

### Create a principal

```typescript
import { useCreatePrincipalMutation } from './hooks';

const { mutate: createPrincipal } = useCreatePrincipalMutation();

createPrincipal({
  input: {
    name: 'my-bot',
    allowedMask: null,
    isReadOnly: false,
    bypassStepUp: true,
    entityIds: null
  }
});
```

### Delete a principal

```typescript
import { useDeletePrincipalMutation } from './hooks';

const { mutate: deletePrincipal } = useDeletePrincipalMutation();

deletePrincipal({
  input: { principalId: principalId }
});
```

### Query principals

```typescript
import { usePrincipalsQuery } from './hooks';

const { data, isLoading } = usePrincipalsQuery({
  selection: {
    fields: {
      id: true,
      name: true,
      userId: true,
      isReadOnly: true
    }
  }
});
```

## Error Handling

All principal mutations return discriminated union results. Handle errors with `.unwrap()` or `.unwrapOr()`:

```typescript
const result = await db.createPrincipal({
  data: { name: 'bot', allowedMask: null, isReadOnly: false, bypassStepUp: true, entityIds: null },
  select: { id: true }
}).execute();

// Throws on error
const principal = result.unwrap();

// Or handle gracefully
const principal = result.unwrapOr(null);
if (!principal) {
  // handle error
}
```

### Expected errors

| Error | Cause |
|-------|-------|
| `NOT_AUTHENTICATED` | No valid session |
| `PRINCIPAL_CANNOT_CREATE_PRINCIPAL` | A principal session tried to create another principal (AuthzHumanOnly) |
| `PRINCIPAL_CANNOT_DELETE_PRINCIPAL` | A principal session tried to delete a principal (AuthzHumanOnly) |
| `PRINCIPAL_NOT_FOUND` | The principal ID doesn't exist |
| `NOT_OWNER` | Caller doesn't own the principal |

## Workflow: Create a Principal with an API Key

A typical workflow to create a fully usable principal:

```typescript
// 1. Create the principal (human session required)
const principal = (await db.createPrincipal({
  data: { name: 'deploy-bot', allowedMask: null, isReadOnly: false, bypassStepUp: true, entityIds: null },
  select: { id: true, userId: true }
}).execute()).unwrap();

// 2. Create an API key for the principal
const apiKey = (await db.createApiKey({
  data: {
    principalId: principal.id,
    name: 'deploy-bot-key'
  },
  select: { id: true, secret: true }
}).execute()).unwrap();

// 3. The API key secret can now be used to authenticate as this principal
// When authenticated, jwt.claims.principal_id = principal.userId
// and jwt.claims.user_id = the human who created it
```

## References

- `constructive-db-principals` skill — SQL-level internals (module generator, SPRT integration, RLS policies)
- `constructive-db-security` skill — AuthzHumanOnly policy details
- `references/principal-fields.md` — Field reference for principals and principal_entities tables
