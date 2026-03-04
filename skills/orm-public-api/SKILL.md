---
name: orm-public-api
description: API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings
---

# orm-public-api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings

## Usage

```typescript
db.api.findMany({ select: { id: true } }).execute()
db.api.findOne({ id: '<value>', select: { id: true } }).execute()
db.api.create({ data: { databaseId: '<value>', name: '<value>', dbname: '<value>', roleName: '<value>', anonRole: '<value>', isPublic: '<value>' }, select: { id: true } }).execute()
db.api.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.api.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all api records

```typescript
const items = await db.api.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a api

```typescript
const item = await db.api.create({
  data: { databaseId: 'value', name: 'value', dbname: 'value', roleName: 'value', anonRole: 'value', isPublic: 'value' },
  select: { id: true }
}).execute();
```
