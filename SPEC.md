# PostgreSQL Role and Grant Management Specification

This document specifies the patterns and requirements for creating, granting, and managing PostgreSQL roles and users in the Constructive codebase. It addresses race conditions, idempotency, and SQL safety concerns identified in the current implementation.

## Problem Statement

Under concurrent execution (e.g., parallel CI jobs, multiple deployments), PostgreSQL role and grant operations can fail with race conditions:

1. **CREATE ROLE race**: When multiple processes try to create the same role simultaneously, PostgreSQL's `pg_authid_rolname_index` unique constraint can be violated before the duplicate object detection runs, resulting in `unique_violation` (error code 23505) instead of the expected `duplicate_object` (error code 42710).

2. **GRANT membership race**: Similarly, `GRANT role TO user` can race on the `pg_auth_members` unique index, causing `unique_violation` errors.

## Affected Code Paths

The following files contain role/grant operations that need to follow this specification:

| File | Function/Location | Operations |
|------|-------------------|------------|
| `pgpm/core/src/init/sql/bootstrap-roles.sql` | DO block | CREATE ROLE (anonymous, authenticated, administrator) |
| `pgpm/core/src/init/sql/bootstrap-test-roles.sql` | DO blocks | CREATE ROLE (app_user, app_admin), GRANT role memberships |
| `pgpm/core/src/init/client.ts` | `bootstrapDbRoles()` | CREATE ROLE, GRANT role memberships |
| `pgpm/core/src/init/client.ts` | `removeDbRoles()` | REVOKE, DROP ROLE |
| `postgres/pgsql-test/src/admin.ts` | `createUserRole()` | CREATE ROLE, GRANT role memberships |
| `postgres/pgsql-test/src/admin.ts` | `grantRole()` | GRANT role membership |

## Required Patterns

### Pattern 1: CREATE ROLE with Concurrency Protection

All `CREATE ROLE` statements must implement the following defense-in-depth approach:

```sql
IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'role_name') THEN
  BEGIN
    PERFORM pg_advisory_xact_lock(42, hashtext('role_name'));
    EXECUTE format('CREATE ROLE %I', 'role_name');
  EXCEPTION
    WHEN duplicate_object OR unique_violation THEN
      NULL;
  END;
END IF;
```

**Components explained:**

1. **Pre-existence check**: `IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = ...)` reduces unnecessary work and lock contention when the role already exists.

2. **Advisory lock**: `pg_advisory_xact_lock(42, hashtext('role_name'))` serializes concurrent role creation attempts for the same role name. The lock is transaction-scoped and automatically released at transaction end.

3. **Exception handling**: Catching both `duplicate_object` AND `unique_violation` handles both the normal "role exists" case and the race condition case where the unique index is hit before PostgreSQL's duplicate detection.

4. **Safe identifier quoting**: Always use `format('%I', ...)` for identifiers and `format('%L', ...)` for literals.

### Pattern 2: GRANT Role Membership with Concurrency Protection

All `GRANT role TO user` statements must implement:

```sql
IF NOT EXISTS (
  SELECT 1 FROM pg_auth_members am
  JOIN pg_roles r1 ON am.roleid = r1.oid
  JOIN pg_roles r2 ON am.member = r2.oid
  WHERE r1.rolname = 'granted_role' AND r2.rolname = 'member_user'
) THEN
  BEGIN
    EXECUTE format('GRANT %I TO %I', 'granted_role', 'member_user');
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
    WHEN undefined_object THEN
      RAISE NOTICE 'Missing role when granting % to %', 'granted_role', 'member_user';
  END;
END IF;
```

**Components explained:**

1. **Pre-existence check**: Query `pg_auth_members` to avoid redundant grants.

2. **Exception handling**: 
   - `unique_violation`: Handles concurrent grant race
   - `undefined_object`: Handles case where role doesn't exist (logs notice instead of failing)

3. **No advisory lock needed**: The pre-check + exception handling is sufficient for grants since the operation is idempotent.

### Pattern 3: REVOKE and DROP ROLE with Safety

All `REVOKE` and `DROP ROLE` statements must:

1. **Check existence before operating**
2. **Use proper identifier quoting**
3. **Handle missing role gracefully**

```sql
DO $do$
DECLARE
  v_username TEXT := 'user_name';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_username) THEN
    EXECUTE format('REVOKE %I FROM %I', 'anonymous', v_username);
    EXECUTE format('REVOKE %I FROM %I', 'authenticated', v_username);
    EXECUTE format('DROP ROLE %I', v_username);
  END IF;
END
$do$;
```

**Important**: Never use string interpolation like `${username}` directly in SQL. Always use `format('%I', ...)` for identifiers.

## Advisory Lock Registry

To prevent collisions between different subsystems using advisory locks, the following namespace keys are reserved:

| Namespace Key | Purpose |
|---------------|---------|
| 42 | Role creation serialization |

When adding new advisory lock usage, register the namespace key in this table.

**Notes on advisory locks:**
- Advisory locks are cluster-wide (not database-scoped), which is appropriate since roles are also cluster-global
- `hashtext()` provides good distribution but is not collision-free; collisions only cause extra serialization, not incorrectness
- Use `pg_advisory_xact_lock()` (transaction-scoped) rather than `pg_advisory_lock()` (session-scoped) to ensure automatic cleanup

## SQL Safety Requirements

### Identifier Quoting

Always use PostgreSQL's `format()` function with appropriate placeholders:
- `%I` for identifiers (table names, column names, role names)
- `%L` for literals (strings, values)

**Correct:**
```sql
EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_username, v_password);
EXECUTE format('GRANT %I TO %I', 'anonymous', v_username);
EXECUTE format('DROP ROLE %I', v_username);
```

**Incorrect:**
```sql
-- SQL injection risk!
EXECUTE 'DROP ROLE ' || username;
-- Also incorrect in TypeScript:
const sql = `DROP ROLE ${username}`;
```

### String Escaping in TypeScript

When building SQL strings in TypeScript, escape single quotes:
```typescript
const v_username = username.replace(/'/g, "''");
```

## Current Issues to Fix

The following issues exist in the main branch and should be addressed:

### 1. bootstrap-roles.sql

**Location**: `pgpm/core/src/init/sql/bootstrap-roles.sql` lines 5-29

**Issue**: Only catches `duplicate_object`, missing `unique_violation` handling and advisory locks.

**Fix**: Apply Pattern 1 to all three role creations (anonymous, authenticated, administrator).

### 2. bootstrap-test-roles.sql - CREATE ROLE

**Location**: `pgpm/core/src/init/sql/bootstrap-test-roles.sql` lines 4-18

**Issue**: Only catches `duplicate_object`, missing `unique_violation` handling and advisory locks.

**Fix**: Apply Pattern 1 to both role creations (app_user, app_admin).

### 3. bootstrap-test-roles.sql - GRANT statements

**Location**: `pgpm/core/src/init/sql/bootstrap-test-roles.sql` lines 24-69

**Issue**: Missing pre-existence checks for grant memberships.

**Fix**: Apply Pattern 2 to all GRANT statements.

### 4. client.ts bootstrapDbRoles() - CREATE ROLE

**Location**: `pgpm/core/src/init/client.ts` lines 72-78

**Issue**: Only catches `duplicate_object`, missing `unique_violation` handling, pre-existence check, and advisory lock.

**Fix**: Apply Pattern 1.

### 5. client.ts bootstrapDbRoles() - GRANT statements

**Location**: `pgpm/core/src/init/client.ts` lines 88-107

**Issue**: Missing pre-existence checks for grant memberships.

**Fix**: Apply Pattern 2.

### 6. client.ts removeDbRoles()

**Location**: `pgpm/core/src/init/client.ts` lines 139-141

**Issue**: Uses `${username}` directly without `format('%I', ...)` - SQL injection risk.

**Fix**: Apply Pattern 3 with proper identifier quoting.

### 7. admin.ts createUserRole() - CREATE ROLE

**Location**: `postgres/pgsql-test/src/admin.ts` lines 159-168

**Issue**: Catches both exceptions (good!) but missing pre-existence check and advisory lock.

**Fix**: Apply Pattern 1.

## Testing Recommendations

1. **Concurrent load testing**: Run multiple parallel processes that try to create the same role simultaneously to verify race condition handling.

2. **Idempotency testing**: Run the same bootstrap scripts multiple times and verify no errors occur.

3. **SQL injection testing**: Verify that role names with special characters (quotes, semicolons) are handled safely.

## References

- PR #325: Fix concurrent role creation race condition
- PostgreSQL Error Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  - `42710` (duplicate_object): Object already exists
  - `23505` (unique_violation): Unique constraint violation
- PostgreSQL Advisory Locks: https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS
