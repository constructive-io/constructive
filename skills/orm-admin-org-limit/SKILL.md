---
name: orm-admin-org-limit
description: Tracks per-actor usage counts against configurable maximum limits
---

# orm-admin-org-limit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
db.orgLimit.findMany({ select: { id: true } }).execute()
db.orgLimit.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgLimit.create({ data: { name: '<value>', actorId: '<value>', num: '<value>', max: '<value>', entityId: '<value>' }, select: { id: true } }).execute()
db.orgLimit.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.orgLimit.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgLimit records

```typescript
const items = await db.orgLimit.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a orgLimit

```typescript
const item = await db.orgLimit.create({
  data: { name: 'value', actorId: 'value', num: 'value', max: 'value', entityId: 'value' },
  select: { id: true }
}).execute();
```
