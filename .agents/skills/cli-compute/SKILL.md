---
name: cli-compute
description: CLI tool (csdk) for the compute API — provides CRUD commands for 18 tables and 15 custom operations
---

# cli-compute

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the compute API — provides CRUD commands for 18 tables and 15 custom operations

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
- [function-api-binding](references/function-api-binding.md)
- [function-deployment](references/function-deployment.md)
- [function-graph-ref](references/function-graph-ref.md)
- [function-graph-store](references/function-graph-store.md)
- [function-graph-object](references/function-graph-object.md)
- [function-deployment-event](references/function-deployment-event.md)
- [org-function-execution-log](references/org-function-execution-log.md)
- [function-graph-execution-output](references/function-graph-execution-output.md)
- [function-graph-commit](references/function-graph-commit.md)
- [secret-definition](references/secret-definition.md)
- [function-execution-log](references/function-execution-log.md)
- [function-graph](references/function-graph.md)
- [function-graph-execution-node-state](references/function-graph-execution-node-state.md)
- [org-function-invocation](references/org-function-invocation.md)
- [function-invocation](references/function-invocation.md)
- [function-graph-execution](references/function-graph-execution.md)
- [function-definition](references/function-definition.md)
- [read-function-graph](references/read-function-graph.md)
- [validate-function-graph](references/validate-function-graph.md)
- [init-empty-repo](references/init-empty-repo.md)
- [set-data-at-path](references/set-data-at-path.md)
- [import-definitions](references/import-definitions.md)
- [copy-graph](references/copy-graph.md)
- [save-graph](references/save-graph.md)
- [add-edge-and-save](references/add-edge-and-save.md)
- [add-node-and-save](references/add-node-and-save.md)
- [import-graph-json](references/import-graph-json.md)
- [add-edge](references/add-edge.md)
- [add-node](references/add-node.md)
- [insert-node-at-path](references/insert-node-at-path.md)
- [start-execution](references/start-execution.md)
- [provision-bucket](references/provision-bucket.md)
