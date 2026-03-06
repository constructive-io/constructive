---
name: cli-admin
description: CLI tool (csdk) for the admin API — provides CRUD commands for 32 tables and 13 custom operations
---

# cli-admin

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the admin API — provides CRUD commands for 32 tables and 13 custom operations

## Usage

```bash
# Context management
csdk context create <name> --endpoint <url>
csdk context use <name>

# Authentication
csdk auth set-token <token>

# CRUD for any table (e.g. org-get-managers-record)
csdk org-get-managers-record list
csdk org-get-managers-record get --id <value>
csdk org-get-managers-record create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty org-get-managers-record list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk org-get-managers-record list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty org-get-managers-record create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [org-get-managers-record](references/org-get-managers-record.md)
- [org-get-subordinates-record](references/org-get-subordinates-record.md)
- [app-permission](references/app-permission.md)
- [org-permission](references/org-permission.md)
- [app-level-requirement](references/app-level-requirement.md)
- [org-member](references/org-member.md)
- [app-permission-default](references/app-permission-default.md)
- [org-permission-default](references/org-permission-default.md)
- [app-admin-grant](references/app-admin-grant.md)
- [app-owner-grant](references/app-owner-grant.md)
- [org-admin-grant](references/org-admin-grant.md)
- [org-owner-grant](references/org-owner-grant.md)
- [app-limit-default](references/app-limit-default.md)
- [org-limit-default](references/org-limit-default.md)
- [membership-type](references/membership-type.md)
- [org-chart-edge-grant](references/org-chart-edge-grant.md)
- [app-limit](references/app-limit.md)
- [app-achievement](references/app-achievement.md)
- [app-step](references/app-step.md)
- [claimed-invite](references/claimed-invite.md)
- [app-grant](references/app-grant.md)
- [app-membership-default](references/app-membership-default.md)
- [org-limit](references/org-limit.md)
- [org-claimed-invite](references/org-claimed-invite.md)
- [org-grant](references/org-grant.md)
- [org-chart-edge](references/org-chart-edge.md)
- [org-membership-default](references/org-membership-default.md)
- [invite](references/invite.md)
- [app-level](references/app-level.md)
- [app-membership](references/app-membership.md)
- [org-membership](references/org-membership.md)
- [org-invite](references/org-invite.md)
- [app-permissions-get-padded-mask](references/app-permissions-get-padded-mask.md)
- [org-permissions-get-padded-mask](references/org-permissions-get-padded-mask.md)
- [org-is-manager-of](references/org-is-manager-of.md)
- [steps-achieved](references/steps-achieved.md)
- [app-permissions-get-mask](references/app-permissions-get-mask.md)
- [org-permissions-get-mask](references/org-permissions-get-mask.md)
- [app-permissions-get-mask-by-names](references/app-permissions-get-mask-by-names.md)
- [org-permissions-get-mask-by-names](references/org-permissions-get-mask-by-names.md)
- [app-permissions-get-by-mask](references/app-permissions-get-by-mask.md)
- [org-permissions-get-by-mask](references/org-permissions-get-by-mask.md)
- [steps-required](references/steps-required.md)
- [submit-invite-code](references/submit-invite-code.md)
- [submit-org-invite-code](references/submit-org-invite-code.md)
