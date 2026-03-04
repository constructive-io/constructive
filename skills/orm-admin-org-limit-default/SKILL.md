---
name: orm-admin-org-limit-default
description: Default maximum values for each named limit, applied when no per-actor override exists
---

# orm-admin-org-limit-default

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default maximum values for each named limit, applied when no per-actor override exists

## Usage

```typescript
db.orgLimitDefault.findMany({ select: { id: true } }).execute()
db.orgLimitDefault.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgLimitDefault.create({ data: { name: '<value>', max: '<value>' }, select: { id: true } }).execute()
db.orgLimitDefault.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.orgLimitDefault.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgLimitDefault records

```typescript
const items = await db.orgLimitDefault.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a orgLimitDefault

```typescript
const item = await db.orgLimitDefault.create({
  data: { name: 'value', max: 'value' },
  select: { id: true }
}).execute();
```
