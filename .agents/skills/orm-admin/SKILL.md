---
name: orm-admin
description: ORM client for the admin API — provides typed CRUD operations for 30 tables and 12 custom operations
---

# orm-admin

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the admin API — provides typed CRUD operations for 30 tables and 12 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: appAdminGrant, appClaimedInvite, appGrant, appInvite, appMembership, appMembershipDefault, appOwnerGrant, appPermission, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.appAdminGrant.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [app-admin-grant](references/app-admin-grant.md)
- [app-claimed-invite](references/app-claimed-invite.md)
- [app-grant](references/app-grant.md)
- [app-invite](references/app-invite.md)
- [app-membership](references/app-membership.md)
- [app-membership-default](references/app-membership-default.md)
- [app-owner-grant](references/app-owner-grant.md)
- [app-permission](references/app-permission.md)
- [app-permission-default](references/app-permission-default.md)
- [app-permission-default-grant](references/app-permission-default-grant.md)
- [app-permission-default-permission](references/app-permission-default-permission.md)
- [membership-type](references/membership-type.md)
- [org-admin-grant](references/org-admin-grant.md)
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
- [org-permission](references/org-permission.md)
- [org-permission-default](references/org-permission-default.md)
- [org-permission-default-grant](references/org-permission-default-grant.md)
- [org-permission-default-permission](references/org-permission-default-permission.md)
- [app-permissions-get-by-mask](references/app-permissions-get-by-mask.md)
- [app-permissions-get-mask](references/app-permissions-get-mask.md)
- [app-permissions-get-mask-by-names](references/app-permissions-get-mask-by-names.md)
- [app-permissions-get-padded-mask](references/app-permissions-get-padded-mask.md)
- [org-is-manager-of](references/org-is-manager-of.md)
- [org-permissions-get-by-mask](references/org-permissions-get-by-mask.md)
- [org-permissions-get-mask](references/org-permissions-get-mask.md)
- [org-permissions-get-mask-by-names](references/org-permissions-get-mask-by-names.md)
- [org-permissions-get-padded-mask](references/org-permissions-get-padded-mask.md)
- [provision-bucket](references/provision-bucket.md)
- [submit-app-invite-code](references/submit-app-invite-code.md)
- [submit-org-invite-code](references/submit-org-invite-code.md)
