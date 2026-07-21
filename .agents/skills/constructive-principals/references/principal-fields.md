---
name: constructive-principals-fields
description: Field reference for principals and principal_entities tables — columns, types, defaults, and constraints.
---

# Principal Field Reference

## `principals` table

| Field | GraphQL Name | Type | Default | Description |
|-------|-------------|------|---------|-------------|
| `id` | `id` | UUID | auto | Primary key |
| `owner_id` | `ownerId` | UUID (FK → users) | — | Parent human who owns this principal |
| `user_id` | `userId` | UUID (FK → users) | — | Principal's identity row (type=3) |
| `name` | `name` | String | — | Display name (e.g., `'billing-bot'`) |
| `allowed_mask` | `allowedMask` | BitVarying | NULL | Permission subset bitmask. NULL = all parent permissions |
| `is_read_only` | `isReadOnly` | Boolean | false | Read-only mode flag |
| `bypass_step_up` | `bypassStepUp` | Boolean | true | Skip MFA step-up (principals can't do MFA) |
| `created_at` | `createdAt` | DateTime | now() | Creation timestamp |
| `updated_at` | `updatedAt` | DateTime | now() | Last update timestamp |

**RLS:** `AuthzDirectOwner` on `owner_id` — users can only SELECT their own principals.

**Mutations:** `create_principal` and `delete_principal` (both AuthzHumanOnly, SECURITY DEFINER).

## `principal_entities` table

| Field | GraphQL Name | Type | Default | Description |
|-------|-------------|------|---------|-------------|
| `id` | `id` | UUID | auto | Primary key |
| `principal_id` | `principalId` | UUID (FK → principals, CASCADE) | — | The principal being scoped |
| `entity_id` | `entityId` | UUID (FK → users) | — | The org this principal can access |

**Unique constraint:** `(principal_id, entity_id)` — no duplicate scoping.

**RLS:** `AuthzDirectOwner` via the principal's `owner_id` (joined through `principal_id → principals.owner_id`).

**Scoping semantics:**
- No rows = unrestricted (principal inherits access to all parent's orgs)
- 1+ rows = restricted to only those specific orgs

## `create_principal` mutation

| Parameter | GraphQL Name | Type | Required | Description |
|-----------|-------------|------|----------|-------------|
| `name` | `name` | String | Yes | Display name |
| `allowed_mask` | `allowedMask` | BitVarying | No | Permission bitmask (NULL = all) |
| `entity_ids` | `entityIds` | [UUID] | No | Org IDs to scope to (NULL = unrestricted) |
| `is_read_only` | `isReadOnly` | Boolean | No | Default: false |
| `bypass_step_up` | `bypassStepUp` | Boolean | No | Default: true |

**Returns:** The created principal record.

**Guards:** AuthzHumanOnly — only callable by human sessions.

**Side effects:**
1. Creates a `users` row with `type = 3`
2. Creates a `principals` row
3. If `entity_ids` provided, creates `principal_entities` rows

## `delete_principal` mutation

| Parameter | GraphQL Name | Type | Required | Description |
|-----------|-------------|------|----------|-------------|
| `principal_id` | `principalId` | UUID | Yes | The principal to delete |

**Returns:** Success indicator.

**Guards:** AuthzHumanOnly + ownership check (must own the principal).

**Side effects:** CASCADE deletes the principal's `users` row, `principal_entities` rows, SPRT entries, and any associated credentials/sessions.
