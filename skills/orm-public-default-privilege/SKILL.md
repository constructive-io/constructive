---
name: orm-public-default-privilege
description: ORM operations for DefaultPrivilege records
---

# orm-public-default-privilege

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DefaultPrivilege records

## Usage

```typescript
db.defaultPrivilege.findMany({ select: { id: true } }).execute()
db.defaultPrivilege.findOne({ id: '<value>', select: { id: true } }).execute()
db.defaultPrivilege.create({ data: { databaseId: '<value>', schemaId: '<value>', objectType: '<value>', privilege: '<value>', granteeName: '<value>', isGrant: '<value>' }, select: { id: true } }).execute()
db.defaultPrivilege.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.defaultPrivilege.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all defaultPrivilege records

```typescript
const items = await db.defaultPrivilege.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a defaultPrivilege

```typescript
const item = await db.defaultPrivilege.create({
  data: { databaseId: 'value', schemaId: 'value', objectType: 'value', privilege: 'value', granteeName: 'value', isGrant: 'value' },
  select: { id: true }
}).execute();
```
