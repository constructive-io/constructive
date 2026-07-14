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

# CRUD for any table (e.g. app-limit-cap)
csdk app-limit-cap list
csdk app-limit-cap get --id <value>
csdk app-limit-cap create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty app-limit-cap list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk app-limit-cap list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty app-limit-cap create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [app-limit-cap](references/app-limit-cap.md)
- [app-limit-caps-default](references/app-limit-caps-default.md)
- [app-limit](references/app-limit.md)
- [app-limit-credit-code](references/app-limit-credit-code.md)
- [app-limit-credit-code-item](references/app-limit-credit-code-item.md)
- [app-limit-credit](references/app-limit-credit.md)
- [app-limit-credit-redemption](references/app-limit-credit-redemption.md)
- [app-limit-default](references/app-limit-default.md)
- [app-limit-event](references/app-limit-event.md)
- [app-limit-warning](references/app-limit-warning.md)
- [org-limit-aggregate](references/org-limit-aggregate.md)
- [org-limit-cap](references/org-limit-cap.md)
- [org-limit-caps-default](references/org-limit-caps-default.md)
- [org-limit](references/org-limit.md)
- [org-limit-credit](references/org-limit-credit.md)
- [org-limit-default](references/org-limit-default.md)
- [org-limit-event](references/org-limit-event.md)
- [org-limit-warning](references/org-limit-warning.md)
- [provision-bucket](references/provision-bucket.md)
- [seed-app-limit-caps-defaults](references/seed-app-limit-caps-defaults.md)
- [seed-app-limit-defaults](references/seed-app-limit-defaults.md)
- [seed-org-limit-caps-defaults](references/seed-org-limit-caps-defaults.md)
- [seed-org-limit-defaults](references/seed-org-limit-defaults.md)
