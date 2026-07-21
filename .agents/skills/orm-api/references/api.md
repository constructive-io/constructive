# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings

## Usage

```typescript
db.api.findMany({ select: { id: true } }).execute()
db.api.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.api.create({ data: { annotations: '<JSON>', anonRole: '<String>', databaseId: '<UUID>', dbname: '<String>', isPublic: '<Boolean>', labels: '<JSON>', name: '<String>', roleName: '<String>' }, select: { id: true } }).execute()
db.api.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.api.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all api records

```typescript
const items = await db.api.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a api

```typescript
const item = await db.api.create({
  data: { annotations: '<JSON>', anonRole: '<String>', databaseId: '<UUID>', dbname: '<String>', isPublic: '<Boolean>', labels: '<JSON>', name: '<String>', roleName: '<String>' },
  select: { id: true }
}).execute();
```
