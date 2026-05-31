---
name: cli-usage
description: CLI tool (csdk) for the usage API — provides CRUD commands for 18 tables and 5 custom operations
---

# cli-usage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the usage API — provides CRUD commands for 18 tables and 5 custom operations

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

# CRUD for any table (e.g. app-limit-caps-default)
csdk app-limit-caps-default list
csdk app-limit-caps-default get --id <value>
csdk app-limit-caps-default create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty app-limit-caps-default list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk app-limit-caps-default list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty app-limit-caps-default create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [app-limit-caps-default](references/app-limit-caps-default.md)
- [org-limit-caps-default](references/org-limit-caps-default.md)
- [app-limit-cap](references/app-limit-cap.md)
- [org-limit-cap](references/org-limit-cap.md)
- [app-limit-default](references/app-limit-default.md)
- [app-limit-credit](references/app-limit-credit.md)
- [app-limit-credit-code-item](references/app-limit-credit-code-item.md)
- [app-limit-credit-redemption](references/app-limit-credit-redemption.md)
- [org-limit-default](references/org-limit-default.md)
- [org-limit-credit](references/org-limit-credit.md)
- [app-limit-warning](references/app-limit-warning.md)
- [org-limit-warning](references/org-limit-warning.md)
- [app-limit-credit-code](references/app-limit-credit-code.md)
- [app-limit-event](references/app-limit-event.md)
- [org-limit-event](references/org-limit-event.md)
- [app-limit](references/app-limit.md)
- [org-limit-aggregate](references/org-limit-aggregate.md)
- [org-limit](references/org-limit.md)
- [seed-app-limit-caps-defaults](references/seed-app-limit-caps-defaults.md)
- [seed-app-limit-defaults](references/seed-app-limit-defaults.md)
- [seed-org-limit-caps-defaults](references/seed-org-limit-caps-defaults.md)
- [seed-org-limit-defaults](references/seed-org-limit-defaults.md)
- [provision-bucket](references/provision-bucket.md)
