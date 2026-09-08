---
name: cli-admin
description: CLI tool (csdk) for the admin API — provides CRUD commands for 26 tables and 5 custom operations
---

# cli-admin

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the admin API — provides CRUD commands for 26 tables and 5 custom operations

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

# CRUD for any table (e.g. app-admin-grant)
csdk app-admin-grant list
csdk app-admin-grant get --id <value>
csdk app-admin-grant create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty app-admin-grant list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk app-admin-grant list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty app-admin-grant create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [app-admin-grant](references/app-admin-grant.md)
- [app-capability-default-capability](references/app-capability-default-capability.md)
- [app-capability-default-grant](references/app-capability-default-grant.md)
- [app-claimed-invite](references/app-claimed-invite.md)
- [app-grant](references/app-grant.md)
- [app-invite](references/app-invite.md)
- [app-membership](references/app-membership.md)
- [app-membership-default](references/app-membership-default.md)
- [app-owner-grant](references/app-owner-grant.md)
- [membership-type](references/membership-type.md)
- [org-admin-grant](references/org-admin-grant.md)
- [org-capability-default-capability](references/org-capability-default-capability.md)
- [org-capability-default-grant](references/org-capability-default-grant.md)
- [org-chart-edge](references/org-chart-edge.md)
- [org-chart-edge-grant](references/org-chart-edge-grant.md)
- [org-claimed-invite](references/org-claimed-invite.md)
- [org-get-managers-record](references/org-get-managers-record.md)
- [org-get-subordinates-record](references/org-get-subordinates-record.md)
- [org-grant](references/org-grant.md)
- [org-invite](references/org-invite.md)
- [org-member](references/org-member.md)
- [org-member-profile](references/org-member-profile.md)
- [org-membership](references/org-membership.md)
- [org-membership-default](references/org-membership-default.md)
- [org-membership-setting](references/org-membership-setting.md)
- [org-owner-grant](references/org-owner-grant.md)
- [get-organization-id](references/get-organization-id.md)
- [org-is-manager-of](references/org-is-manager-of.md)
- [provision-bucket](references/provision-bucket.md)
- [submit-app-invite-code](references/submit-app-invite-code.md)
- [submit-org-invite-code](references/submit-org-invite-code.md)
