# apis

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
db.apis.findMany({ select: { id: true } }).execute()
db.apis.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.apis.create({ data: { anonRole: '<String>', config: '<JSON>', databaseId: '<UUID>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' }, select: { id: true } }).execute()
db.apis.update({ where: { id: '<UUID>' }, data: { anonRole: '<String>' }, select: { id: true } }).execute()
db.apis.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all apis records

```typescript
const items = await db.apis.findMany({
  select: { id: true, anonRole: true }
}).execute();
```

### Create a apis

```typescript
const item = await db.apis.create({
  data: { anonRole: '<String>', config: '<JSON>', databaseId: '<UUID>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' },
  select: { id: true }
}).execute();
```
