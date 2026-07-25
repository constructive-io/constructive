# platformApi

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
db.platformApi.findMany({ select: { id: true } }).execute()
db.platformApi.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformApi.create({ data: { anonRole: '<String>', config: '<JSON>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' }, select: { id: true } }).execute()
db.platformApi.update({ where: { id: '<UUID>' }, data: { anonRole: '<String>' }, select: { id: true } }).execute()
db.platformApi.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformApi records

```typescript
const items = await db.platformApi.findMany({
  select: { id: true, anonRole: true }
}).execute();
```

### Create a platformApi

```typescript
const item = await db.platformApi.create({
  data: { anonRole: '<String>', config: '<JSON>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' },
  select: { id: true }
}).execute();
```
