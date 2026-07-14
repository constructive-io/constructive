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

# CRUD for any table (e.g. commit)
csdk commit list
csdk commit get --id <value>
csdk commit create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty commit list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk commit list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty commit create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [commit](references/commit.md)
- [get-all-record](references/get-all-record.md)
- [object](references/object.md)
- [ref](references/ref.md)
- [store](references/store.md)
- [init-empty-repo](references/init-empty-repo.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [provision-bucket](references/provision-bucket.md)
- [set-data-at-path](references/set-data-at-path.md)
