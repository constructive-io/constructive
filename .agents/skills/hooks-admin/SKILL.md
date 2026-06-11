---
name: hooks-admin
description: React Query hooks for the admin API — provides typed query and mutation hooks for 30 tables and 12 custom operations
---

# hooks-admin

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the admin API — provides typed query and mutation hooks for 30 tables and 12 custom operations

## Usage

```typescript
// Import hooks
import { useOrgGetManagersQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useOrgGetManagersQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useOrgGetManagersQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [org-get-managers-record](references/org-get-managers-record.md)
- [org-get-subordinates-record](references/org-get-subordinates-record.md)
- [app-permission](references/app-permission.md)
- [app-permission-default-grant](references/app-permission-default-grant.md)
- [org-permission](references/org-permission.md)
- [org-permission-default-permission](references/org-permission-default-permission.md)
- [org-permission-default-grant](references/org-permission-default-grant.md)
- [org-member](references/org-member.md)
- [app-permission-default](references/app-permission-default.md)
- [org-permission-default](references/org-permission-default.md)
- [app-permission-default-permission](references/app-permission-default-permission.md)
- [app-admin-grant](references/app-admin-grant.md)
- [app-owner-grant](references/app-owner-grant.md)
- [org-admin-grant](references/org-admin-grant.md)
- [org-owner-grant](references/org-owner-grant.md)
- [org-chart-edge-grant](references/org-chart-edge-grant.md)
- [app-claimed-invite](references/app-claimed-invite.md)
- [membership-type](references/membership-type.md)
- [app-grant](references/app-grant.md)
- [app-membership-default](references/app-membership-default.md)
- [org-membership-default](references/org-membership-default.md)
- [org-claimed-invite](references/org-claimed-invite.md)
- [org-grant](references/org-grant.md)
- [org-chart-edge](references/org-chart-edge.md)
- [org-membership-setting](references/org-membership-setting.md)
- [app-membership](references/app-membership.md)
- [org-membership](references/org-membership.md)
- [org-member-profile](references/org-member-profile.md)
- [app-invite](references/app-invite.md)
- [org-invite](references/org-invite.md)
- [app-permissions-get-padded-mask](references/app-permissions-get-padded-mask.md)
- [org-permissions-get-padded-mask](references/org-permissions-get-padded-mask.md)
- [org-is-manager-of](references/org-is-manager-of.md)
- [app-permissions-get-mask](references/app-permissions-get-mask.md)
- [org-permissions-get-mask](references/org-permissions-get-mask.md)
- [app-permissions-get-mask-by-names](references/app-permissions-get-mask-by-names.md)
- [org-permissions-get-mask-by-names](references/org-permissions-get-mask-by-names.md)
- [app-permissions-get-by-mask](references/app-permissions-get-by-mask.md)
- [org-permissions-get-by-mask](references/org-permissions-get-by-mask.md)
- [submit-app-invite-code](references/submit-app-invite-code.md)
- [submit-org-invite-code](references/submit-org-invite-code.md)
- [provision-bucket](references/provision-bucket.md)
