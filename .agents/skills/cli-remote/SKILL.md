---
name: cli-remote
description: CLI tool (csdk) for the remote API — provides CRUD commands for 3 tables and 1 custom operations
---

# cli-remote

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the remote API — provides CRUD commands for 3 tables and 1 custom operations

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

# CRUD for any table (e.g. machine)
csdk machine list
csdk machine get --id <value>
csdk machine create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty machine list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk machine list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty machine create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [machine](references/machine.md)
- [machine-message](references/machine-message.md)
- [machine-session](references/machine-session.md)
- [provision-bucket](references/provision-bucket.md)
