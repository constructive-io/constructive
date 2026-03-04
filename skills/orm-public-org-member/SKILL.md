---
name: orm-public-org-member
description: Simplified view of active members in an entity, used for listing who belongs to an org or group
---

# orm-public-org-member

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Simplified view of active members in an entity, used for listing who belongs to an org or group

## Usage

```typescript
db.orgMember.findMany({ select: { id: true } }).execute()
db.orgMember.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgMember.create({ data: { isAdmin: '<value>', actorId: '<value>', entityId: '<value>' }, select: { id: true } }).execute()
db.orgMember.update({ where: { id: '<value>' }, data: { isAdmin: '<new>' }, select: { id: true } }).execute()
db.orgMember.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgMember records

```typescript
const items = await db.orgMember.findMany({
  select: { id: true, isAdmin: true }
}).execute();
```

### Create a orgMember

```typescript
const item = await db.orgMember.create({
  data: { isAdmin: 'value', actorId: 'value', entityId: 'value' },
  select: { id: true }
}).execute();
```
