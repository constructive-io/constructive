---
name: cli-objects
description: CLI tool (csdk) for the objects API — provides CRUD commands for 5 tables and 4 custom operations
---

# cli-objects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the objects API — provides CRUD commands for 5 tables and 4 custom operations

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

# CRUD for any table (e.g. get-all-record)
csdk get-all-record list
csdk get-all-record get --id <value>
csdk get-all-record create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty get-all-record list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk get-all-record list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty get-all-record create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [get-all-record](references/get-all-record.md)
- [ref](references/ref.md)
- [store](references/store.md)
- [object](references/object.md)
- [commit](references/commit.md)
- [init-empty-repo](references/init-empty-repo.md)
- [set-data-at-path](references/set-data-at-path.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [provision-bucket](references/provision-bucket.md)
