---
name: cli-config
description: CLI tool (csdk) for the config API — provides CRUD commands for 2 tables and 9 custom operations
---

# cli-config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the config API — provides CRUD commands for 2 tables and 9 custom operations

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

# CRUD for any table (e.g. platform-config-definition)
csdk platform-config-definition list
csdk platform-config-definition get --id <value>
csdk platform-config-definition create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty platform-config-definition list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk platform-config-definition list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty platform-config-definition create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [platform-config-definition](references/platform-config-definition.md)
- [platform-config](references/platform-config.md)
- [platform-secrets-del](references/platform-secrets-del.md)
- [org-secrets-del](references/org-secrets-del.md)
- [platform-secrets-remove-array](references/platform-secrets-remove-array.md)
- [org-secrets-remove-array](references/org-secrets-remove-array.md)
- [platform-secrets-rotate](references/platform-secrets-rotate.md)
- [platform-secrets-set](references/platform-secrets-set.md)
- [org-secrets-rotate](references/org-secrets-rotate.md)
- [org-secrets-set](references/org-secrets-set.md)
- [provision-bucket](references/provision-bucket.md)
