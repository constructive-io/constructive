---
name: orm-admin
description: ORM client for the admin API — provides typed CRUD operations for 42 tables and 12 custom operations
---

# orm-admin

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the admin API — provides typed CRUD operations for 42 tables and 12 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: appAdminGrant, appCapability, appCapabilityDefaultCapability, appCapabilityDefault, appCapabilityDefaultGrant, appClaimedInvite, appGrant, appInvite, ...
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
- [app-capability](references/app-capability.md)
- [app-capability-default-capability](references/app-capability-default-capability.md)
- [app-capability-default](references/app-capability-default.md)
- [app-capability-default-grant](references/app-capability-default-grant.md)
- [app-claimed-invite](references/app-claimed-invite.md)
- [app-grant](references/app-grant.md)
- [app-invite](references/app-invite.md)
- [app-membership](references/app-membership.md)
- [app-membership-default](references/app-membership-default.md)
- [app-membership-profile](references/app-membership-profile.md)
- [app-owner-grant](references/app-owner-grant.md)
- [app-profile-capability](references/app-profile-capability.md)
- [app-profile](references/app-profile.md)
- [app-profile-definition-grant](references/app-profile-definition-grant.md)
- [app-profile-grant](references/app-profile-grant.md)
- [app-profile-template](references/app-profile-template.md)
- [membership-type](references/membership-type.md)
- [org-admin-grant](references/org-admin-grant.md)
- [org-capability](references/org-capability.md)
- [org-capability-default-capability](references/org-capability-default-capability.md)
- [org-capability-default](references/org-capability-default.md)
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
- [org-membership-profile](references/org-membership-profile.md)
- [org-membership-setting](references/org-membership-setting.md)
- [org-owner-grant](references/org-owner-grant.md)
- [org-profile-capability](references/org-profile-capability.md)
- [org-profile](references/org-profile.md)
- [org-profile-definition-grant](references/org-profile-definition-grant.md)
- [org-profile-grant](references/org-profile-grant.md)
- [org-profile-template](references/org-profile-template.md)
- [app-capabilities-get-by-mask](references/app-capabilities-get-by-mask.md)
- [app-capabilities-get-mask](references/app-capabilities-get-mask.md)
- [app-capabilities-get-mask-by-names](references/app-capabilities-get-mask-by-names.md)
- [app-capabilities-get-padded-mask](references/app-capabilities-get-padded-mask.md)
- [org-capabilities-get-by-mask](references/org-capabilities-get-by-mask.md)
- [org-capabilities-get-mask](references/org-capabilities-get-mask.md)
- [org-capabilities-get-mask-by-names](references/org-capabilities-get-mask-by-names.md)
- [org-capabilities-get-padded-mask](references/org-capabilities-get-padded-mask.md)
- [org-is-manager-of](references/org-is-manager-of.md)
- [provision-bucket](references/provision-bucket.md)
- [submit-app-invite-code](references/submit-app-invite-code.md)
- [submit-org-invite-code](references/submit-org-invite-code.md)
