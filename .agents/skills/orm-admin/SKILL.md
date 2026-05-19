---
name: orm-admin
description: ORM client for the admin API — provides typed CRUD operations for 45 tables and 12 custom operations
---

# orm-admin

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the admin API — provides typed CRUD operations for 45 tables and 12 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: orgGetManagersRecord, orgGetSubordinatesRecord, appPermission, orgPermission, appLimitCreditRedemption, appLimitCreditCodeItem, appLimitCredit, orgMember, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.orgGetManagersRecord.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [org-get-managers-record](references/org-get-managers-record.md)
- [org-get-subordinates-record](references/org-get-subordinates-record.md)
- [app-permission](references/app-permission.md)
- [org-permission](references/org-permission.md)
- [app-limit-credit-redemption](references/app-limit-credit-redemption.md)
- [app-limit-credit-code-item](references/app-limit-credit-code-item.md)
- [app-limit-credit](references/app-limit-credit.md)
- [org-member](references/org-member.md)
- [app-permission-default](references/app-permission-default.md)
- [app-admin-grant](references/app-admin-grant.md)
- [app-owner-grant](references/app-owner-grant.md)
- [org-permission-default](references/org-permission-default.md)
- [app-membership-default](references/app-membership-default.md)
- [org-admin-grant](references/org-admin-grant.md)
- [org-membership-default](references/org-membership-default.md)
- [org-owner-grant](references/org-owner-grant.md)
- [app-limit-caps-default](references/app-limit-caps-default.md)
- [org-limit-caps-default](references/org-limit-caps-default.md)
- [app-limit-cap](references/app-limit-cap.md)
- [org-limit-cap](references/org-limit-cap.md)
- [org-chart-edge](references/org-chart-edge.md)
- [app-limit-default](references/app-limit-default.md)
- [org-limit-default](references/org-limit-default.md)
- [org-limit-credit](references/org-limit-credit.md)
- [app-limit-credit-code](references/app-limit-credit-code.md)
- [app-limit-warning](references/app-limit-warning.md)
- [org-chart-edge-grant](references/org-chart-edge-grant.md)
- [app-claimed-invite](references/app-claimed-invite.md)
- [org-limit-warning](references/org-limit-warning.md)
- [membership-type](references/membership-type.md)
- [app-grant](references/app-grant.md)
- [org-claimed-invite](references/org-claimed-invite.md)
- [org-grant](references/org-grant.md)
- [usage-snapshot](references/usage-snapshot.md)
- [app-limit-event](references/app-limit-event.md)
- [org-limit-event](references/org-limit-event.md)
- [org-membership-setting](references/org-membership-setting.md)
- [org-member-profile](references/org-member-profile.md)
- [app-membership](references/app-membership.md)
- [app-limit](references/app-limit.md)
- [org-membership](references/org-membership.md)
- [org-limit-aggregate](references/org-limit-aggregate.md)
- [org-limit](references/org-limit.md)
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
