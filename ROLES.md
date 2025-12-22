# Role Management in Constructive

This document explains the role management system in Constructive, covering the unified dynamic implementation with configurable role names.

## Overview: The Role Model

Constructive uses PostgreSQL roles for authorization, following a membership-based model where users (LOGIN roles) are granted membership in base roles (NOLOGIN group roles).

### Base Roles (NOLOGIN)

These are group roles that define permission levels. They cannot log in directly but are granted to users:

| Role | Purpose | RLS Behavior |
|------|---------|--------------|
| `anonymous` | Unauthenticated access | Subject to RLS |
| `authenticated` | Authenticated user access | Subject to RLS |
| `administrator` | Admin access | Bypasses RLS |

### Users (LOGIN roles)

Users are roles with LOGIN capability that can connect to the database. They are granted membership in base roles to inherit permissions.

## Unified Dynamic Implementation

All role management is now handled by a single shared module in `@pgpmjs/core/src/roles/index.ts`. This provides:

1. **Configurable role names** - defaults to canonical names (`anonymous`, `authenticated`, `administrator`) but can be customized
2. **Single source of truth** - both `PgpmInit` (CLI) and `DbAdmin` (test harness) use the same SQL generators
3. **Concurrency safety** - all operations include IF NOT EXISTS pre-checks and exception handling for TOCTOU safety
4. **Optional advisory locking** - when `useLocks: true`, wraps CREATE ROLE operations with `pg_advisory_xact_lock`

### SQL Generators

The shared module exports these SQL generators:

| Function | Purpose |
|----------|---------|
| `generateCreateBaseRolesSQL(roles?)` | Create base roles (anonymous, authenticated, administrator) |
| `generateCreateUserSQL(username, password, roles?, options?)` | Create a user with grants to base roles |
| `generateCreateTestUsersSQL(roles?)` | Create test users (app_user, app_admin) |
| `generateCreateUserWithGrantsSQL(username, password, rolesToGrant, options?)` | Create a user with grants to specified roles |
| `generateGrantRoleSQL(role, user)` | Grant a single role to a user |
| `generateRemoveUserSQL(username, roles?, options?)` | Remove a user and revoke grants |

### Role Mapping

Role names are configurable via the `RoleMapping` interface from `@pgpmjs/types`:

```typescript
interface RoleMapping {
  anonymous?: string;      // default: 'anonymous'
  authenticated?: string;  // default: 'authenticated'
  administrator?: string;  // default: 'administrator'
  default?: string;        // default: 'anonymous'
}
```

## Entry Points and Call Paths

### 1. Bootstrap Base Roles (Dynamic TypeScript)

**Command:** `pgpm admin-users bootstrap`

**Call Path:**
```
pgpm admin-users bootstrap
  -> pgpm/pgpm/src/commands/admin-users/bootstrap.ts
    -> new PgpmInit(pgEnv)
      -> init.bootstrapRoles(roles?)
        -> generateCreateBaseRolesSQL(roles?)
```

**What it does:**
- Creates the three base roles: `anonymous`, `authenticated`, `administrator` (or custom names via `roles` parameter)
- Sets role attributes (NOLOGIN, NOCREATEDB, etc.)
- Administrator gets BYPASSRLS, others do not

**When to use:**
- One-time setup when initializing a new database
- Must be run before adding any users

### 2. Add Test Users (Dynamic TypeScript)

**Command:** `pgpm admin-users add --test`

**Call Path:**
```
pgpm admin-users add --test
  -> pgpm/pgpm/src/commands/admin-users/add.ts
    -> new PgpmInit(pgEnv)
      -> init.bootstrapTestRoles(roles?, testUsers?)
        -> generateCreateTestUsersSQL(roles?, testUsers?)
```

**What it does:**
- Creates `app_user` and `app_admin` with credentials from `pgpmDefaults.db.connection` (or custom via `testUsers` parameter)
- Grants `anonymous` and `authenticated` to `app_user`
- Grants `anonymous`, `authenticated`, and `administrator` to `app_admin`

**When to use:**
- Local development only
- Never on production (default passwords)

**Prerequisites:**
- Base roles must exist (run `pgpm admin-users bootstrap` first)

### 3. Add Custom User (Dynamic TypeScript)

**Command:** `pgpm admin-users add --username X --password Y`

**Call Path:**
```
pgpm admin-users add --username myuser --password mypass
  -> pgpm/pgpm/src/commands/admin-users/add.ts
    -> new PgpmInit(pgEnv)
      -> init.bootstrapDbRoles(username, password, options?)
        -> Dynamic SQL with parameterized username/password
```

**What it does:**
- Creates a LOGIN role with the provided username and password
- Grants `anonymous` and `authenticated` to the new user

**When to use:**
- Production user creation
- Any time you need a user with custom credentials

**Prerequisites:**
- Base roles must exist (run `pgpm admin-users bootstrap` first)

### 4. Remove User (Dynamic TypeScript)

**Command:** `pgpm admin-users remove --username X` or `pgpm admin-users remove --test`

**Call Path:**
```
pgpm admin-users remove --username myuser
  -> pgpm/pgpm/src/commands/admin-users/remove.ts
    -> new PgpmInit(pgEnv)
      -> init.removeDbRoles(username, options?)
        -> Dynamic SQL with parameterized username
```

**What it does:**
- Revokes `anonymous` and `authenticated` memberships
- Drops the role

### 5. Test Harness User Creation (Dynamic TypeScript)

**Entry Point:** `getConnections()` in `postgres/pgsql-test/src/connect.ts`

**Call Path:**
```
getConnections(options, seedAdapters)
  -> getPgRootAdmin(config, connOpts)
    -> new DbAdmin(opts, false, connOpts)
  -> root.createUserRole(user, password, dbName, options?)
    -> Dynamic SQL with configurable role names via getRoleName()
```

**What it does:**
- Creates a test user for connecting to the test database
- Grants `anonymous`, `authenticated`, and `administrator` roles
- Uses `getRoleName()` to support configurable role names via `PgTestConnectionOptions.roles`

**When to use:**
- Automated test setup (Jest, etc.)
- CI/CD pipelines
- Any programmatic test database creation

**Key Difference from CLI:**
- Role names are configurable via `PgTestConnectionOptions.roles`
- Grants administrator role (for testing purposes only)

### 6. Grant Single Role (Dynamic TypeScript)

**Entry Point:** `DbAdmin.grantRole()` in `postgres/pgsql-test/src/admin.ts`

**Call Path:**
```
admin.grantRole(role, user, dbName, options?)
  -> Dynamic SQL with pre-check and exception handling
```

**What it does:**
- Grants a single role to a user
- Pre-checks membership to avoid unnecessary operations
- Handles concurrent grant attempts gracefully

**When to use:**
- Flexible role granting in tests
- When you need to grant a specific role outside the standard patterns

## Where Base Roles Come From in Tests

When running tests via `getConnections()`, base roles must already exist. They are typically created by:

1. **PGPM deployment via seed adapter:** The default `seed.pgpm()` adapter deploys the PGPM module which may include role creation in migrations
2. **Container initialization:** Docker images may have roles pre-created
3. **Manual bootstrap:** Running `pgpm admin-users bootstrap` before tests

The `getConnections()` function assumes base roles exist when it calls `createUserRole()` to grant them.

## Role Name Configuration

### Static SQL (Hardcoded)

The SQL files use hardcoded role names:
- `anonymous`
- `authenticated`
- `administrator`

### Dynamic TypeScript (Configurable in pgsql-test)

The `pgsql-test` package supports configurable role names via `PgTestConnectionOptions.roles`:

```typescript
const connections = await getConnections({
  db: {
    roles: {
      anonymous: 'custom_anon',
      authenticated: 'custom_auth',
      administrator: 'custom_admin',
      default: 'custom_anon'
    }
  }
});
```

This is useful when:
- Testing with non-standard role names
- Running tests against databases with different role configurations

## Concurrency Safety

All role management operations are designed to be idempotent and safe under concurrent execution:

1. **IF NOT EXISTS pre-checks:** Avoid unnecessary CREATE/GRANT attempts
2. **Exception handling:** Catch and ignore race conditions (duplicate_object, unique_violation)
3. **Optional advisory locking:** When `useLocks: true`, wraps CREATE ROLE operations with `pg_advisory_xact_lock(42, hashtext(username))`

### Error Handling by Operation

| Operation | Ignored Errors | Surfaced Errors |
|-----------|---------------|-----------------|
| CREATE ROLE | 42710 (duplicate_object), 23505 (unique_violation) | 42501 (insufficient_privilege) |
| GRANT | 23505 (unique_violation), 42704 (undefined_object) | 42501 (insufficient_privilege), 0LP01 (invalid_grant_operation) |
| REVOKE/DROP | 42704 (undefined_object) | 2BP01 (dependent_objects_still_exist), 55006 (object_in_use), 42501 (insufficient_privilege) |

## Summary: When to Use What

| Scenario | Mechanism | Entry Point |
|----------|-----------|-------------|
| Initialize base roles | Static SQL | `pgpm admin-users bootstrap` |
| Add test users (dev only) | Static SQL | `pgpm admin-users add --test` |
| Add production user | Dynamic TS | `pgpm admin-users add --username X --password Y` |
| Remove user | Dynamic TS | `pgpm admin-users remove` |
| Automated test setup | Dynamic TS | `getConnections()` -> `createUserRole()` |
| Grant specific role | Dynamic TS | `admin.grantRole()` |

## File Locations

| File | Purpose |
|------|---------|
| `pgpm/core/src/roles/index.ts` | **Shared SQL generators** (single source of truth) |
| `pgpm/core/src/init/client.ts` | PgpmInit class (CLI operations, uses shared module) |
| `postgres/pgsql-test/src/admin.ts` | DbAdmin class (test operations, uses shared module) |
| `postgres/pgsql-test/src/roles.ts` | Role name configuration helpers |
| `postgres/pgsql-test/src/connect.ts` | Test connection setup |
| `pgpm/types/src/pgpm.ts` | RoleMapping interface and defaults |

### Defaults

All role and test user defaults are sourced from `pgpmDefaults` in `@pgpmjs/types`:

| Default | Source |
|---------|--------|
| Role names | `pgpmDefaults.db.roles` (anonymous, authenticated, administrator) |
| Test user credentials | `pgpmDefaults.db.connection` (app_user/app_password) |
| Test admin credentials | Hardcoded (app_admin/admin_password) |
