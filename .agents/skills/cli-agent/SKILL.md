---
name: cli-agent
description: CLI tool (csdk) for the agent API — provides CRUD commands for 6 tables and 1 custom operations
---

# cli-agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the agent API — provides CRUD commands for 6 tables and 1 custom operations

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

# CRUD for any table (e.g. agent-plan)
csdk agent-plan list
csdk agent-plan get --id <value>
csdk agent-plan create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty agent-plan list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk agent-plan list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty agent-plan create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [embedder](references/embedder.md)
- [agent-plan](references/agent-plan.md)
- [agent-message](references/agent-message.md)
- [agent-task](references/agent-task.md)
- [agent-thread](references/agent-thread.md)
- [agent-prompt](references/agent-prompt.md)
- [agent-skill](references/agent-skill.md)
- [provision-bucket](references/provision-bucket.md)
