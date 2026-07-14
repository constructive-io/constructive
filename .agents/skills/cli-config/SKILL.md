---
name: cli-config
description: CLI tool (csdk) for the config API — provides CRUD commands for 5 tables and 13 custom operations
---

# cli-config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the config API — provides CRUD commands for 5 tables and 13 custom operations

## Usage

```bash
# Context management
csdk context create <name> --endpoint <url>
csdk context use <name>

# Authentication
csdk auth set-token <token>

# Config variables
csdk config set <key> <value>
csdk config get <key>

# CRUD for any table (e.g. config)
csdk config list
csdk config get --id <value>
csdk config create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty config list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk config list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty config create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [config](references/config.md)
- [platform-config](references/platform-config.md)
- [platform-internal-secret](references/platform-internal-secret.md)
- [platform-secret](references/platform-secret.md)
- [secret](references/secret.md)
- [secrets-del](references/secrets-del.md)
- [secrets-remove-array](references/secrets-remove-array.md)
- [secrets-rotate](references/secrets-rotate.md)
- [secrets-set](references/secrets-set.md)
- [platform-internal-secrets-del](references/platform-internal-secrets-del.md)
- [platform-internal-secrets-remove-array](references/platform-internal-secrets-remove-array.md)
- [platform-internal-secrets-rotate](references/platform-internal-secrets-rotate.md)
- [platform-internal-secrets-set](references/platform-internal-secrets-set.md)
- [platform-secrets-del](references/platform-secrets-del.md)
- [platform-secrets-remove-array](references/platform-secrets-remove-array.md)
- [platform-secrets-rotate](references/platform-secrets-rotate.md)
- [platform-secrets-set](references/platform-secrets-set.md)
- [provision-bucket](references/provision-bucket.md)
