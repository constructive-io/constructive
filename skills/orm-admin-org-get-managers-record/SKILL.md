---
name: orm-admin-org-get-managers-record
description: ORM operations for OrgGetManagersRecord records
---

# orm-admin-org-get-managers-record

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for OrgGetManagersRecord records

## Usage

```typescript
db.orgGetManagersRecord.findMany({ select: { id: true } }).execute()
db.orgGetManagersRecord.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgGetManagersRecord.create({ data: { userId: '<value>', depth: '<value>' }, select: { id: true } }).execute()
db.orgGetManagersRecord.update({ where: { id: '<value>' }, data: { userId: '<new>' }, select: { id: true } }).execute()
db.orgGetManagersRecord.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgGetManagersRecord records

```typescript
const items = await db.orgGetManagersRecord.findMany({
  select: { id: true, userId: true }
}).execute();
```

### Create a orgGetManagersRecord

```typescript
const item = await db.orgGetManagersRecord.create({
  data: { userId: 'value', depth: 'value' },
  select: { id: true }
}).execute();
```
