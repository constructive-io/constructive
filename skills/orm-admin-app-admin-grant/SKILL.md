---
name: orm-admin-app-admin-grant
description: Records of admin role grants and revocations between members
---

# orm-admin-app-admin-grant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of admin role grants and revocations between members

## Usage

```typescript
db.appAdminGrant.findMany({ select: { id: true } }).execute()
db.appAdminGrant.findOne({ id: '<value>', select: { id: true } }).execute()
db.appAdminGrant.create({ data: { isGrant: '<value>', actorId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute()
db.appAdminGrant.update({ where: { id: '<value>' }, data: { isGrant: '<new>' }, select: { id: true } }).execute()
db.appAdminGrant.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all appAdminGrant records

```typescript
const items = await db.appAdminGrant.findMany({
  select: { id: true, isGrant: true }
}).execute();
```

### Create a appAdminGrant

```typescript
const item = await db.appAdminGrant.create({
  data: { isGrant: 'value', actorId: 'value', grantorId: 'value' },
  select: { id: true }
}).execute();
```
