---
name: cli-infra
description: CLI tool (csdk) for the infra API — provides CRUD commands for 10 tables and 4 custom operations
---

# cli-infra

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the infra API — provides CRUD commands for 10 tables and 4 custom operations

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

# CRUD for any table (e.g. infra-get-all-record)
csdk infra-get-all-record list
csdk infra-get-all-record get --id <value>
csdk infra-get-all-record create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty infra-get-all-record list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk infra-get-all-record list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty infra-get-all-record create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [infra-get-all-record](references/infra-get-all-record.md)
- [infra-ref](references/infra-ref.md)
- [infra-store](references/infra-store.md)
- [infra-object](references/infra-object.md)
- [infra-commit](references/infra-commit.md)
- [db-preset](references/db-preset.md)
- [platform-namespace](references/platform-namespace.md)
- [namespace](references/namespace.md)
- [platform-namespace-event](references/platform-namespace-event.md)
- [namespace-event](references/namespace-event.md)
- [infra-init-empty-repo](references/infra-init-empty-repo.md)
- [infra-set-data-at-path](references/infra-set-data-at-path.md)
- [infra-insert-node-at-path](references/infra-insert-node-at-path.md)
- [provision-bucket](references/provision-bucket.md)
