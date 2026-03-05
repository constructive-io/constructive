---
name: cli-objects
description: CLI tool (app) for the objects API — provides CRUD commands for 5 tables and 12 custom operations
---

# cli-objects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (app) for the objects API — provides CRUD commands for 5 tables and 12 custom operations

## Usage

```bash
# Context management
app context create <name> --endpoint <url>
app context use <name>

# Authentication
app auth set-token <token>

# CRUD for any table (e.g. get-all-record)
app get-all-record list
app get-all-record get --id <value>
app get-all-record create --<field> <value>
```

## Examples

### Set up and query

```bash
app context create local --endpoint http://localhost:5000/graphql
app context use local
app auth set-token <token>
app get-all-record list
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
