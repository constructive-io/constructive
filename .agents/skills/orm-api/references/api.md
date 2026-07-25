# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
db.api.findMany({ select: { id: true } }).execute()
db.api.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.api.create({ data: { anonRole: '<String>', config: '<JSON>', databaseId: '<UUID>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' }, select: { id: true } }).execute()
db.api.update({ where: { id: '<UUID>' }, data: { anonRole: '<String>' }, select: { id: true } }).execute()
db.api.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all api records

```typescript
const items = await db.api.findMany({
  select: { id: true, anonRole: true }
}).execute();
```

### Create a api

```typescript
const item = await db.api.create({
  data: { anonRole: '<String>', config: '<JSON>', databaseId: '<UUID>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' },
  select: { id: true }
}).execute();
```
