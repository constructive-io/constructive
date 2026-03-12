---
name: cli-objects
description: CLI tool (csdk) for the objects API — provides CRUD commands for 5 tables and 12 custom operations
---

# cli-objects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the objects API — provides CRUD commands for 5 tables and 12 custom operations

## Usage

```bash
# Context management
csdk context create <name> --endpoint <url>
csdk context use <name>

# Authentication
csdk auth set-token <token>

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
- [get-all-record](references/get-all-record.md)
- [object](references/object.md)
- [ref](references/ref.md)
- [store](references/store.md)
- [commit](references/commit.md)
- [rev-parse](references/rev-parse.md)
- [get-all-objects-from-root](references/get-all-objects-from-root.md)
- [get-path-objects-from-root](references/get-path-objects-from-root.md)
- [get-object-at-path](references/get-object-at-path.md)
- [freeze-objects](references/freeze-objects.md)
- [init-empty-repo](references/init-empty-repo.md)
- [remove-node-at-path](references/remove-node-at-path.md)
- [set-data-at-path](references/set-data-at-path.md)
- [set-props-and-commit](references/set-props-and-commit.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [update-node-at-path](references/update-node-at-path.md)
- [set-and-commit](references/set-and-commit.md)
