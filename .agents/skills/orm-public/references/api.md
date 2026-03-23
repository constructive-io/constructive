# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings

## Usage

```typescript
db.api.findMany({ select: { id: true } }).execute()
db.api.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.api.create({ data: { databaseId: '<UUID>', name: '<String>', dbname: '<String>', roleName: '<String>', anonRole: '<String>', isPublic: '<Boolean>' }, select: { id: true } }).execute()
db.api.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.api.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', name: '<String>', dbname: '<String>', roleName: '<String>', anonRole: '<String>', isPublic: '<Boolean>' },
  select: { id: true }
}).execute();
```
