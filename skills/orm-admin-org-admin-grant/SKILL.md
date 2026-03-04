---
name: orm-admin-org-admin-grant
description: Records of admin role grants and revocations between members
---

# orm-admin-org-admin-grant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of admin role grants and revocations between members

## Usage

```typescript
db.orgAdminGrant.findMany({ select: { id: true } }).execute()
db.orgAdminGrant.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgAdminGrant.create({ data: { isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute()
db.orgAdminGrant.update({ where: { id: '<value>' }, data: { isGrant: '<new>' }, select: { id: true } }).execute()
db.orgAdminGrant.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgAdminGrant records

```typescript
const items = await db.orgAdminGrant.findMany({
  select: { id: true, isGrant: true }
}).execute();
```

### Create a orgAdminGrant

```typescript
const item = await db.orgAdminGrant.create({
  data: { isGrant: 'value', actorId: 'value', entityId: 'value', grantorId: 'value' },
  select: { id: true }
}).execute();
```
