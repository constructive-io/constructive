# platformApis

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
db.platformApis.findMany({ select: { id: true } }).execute()
db.platformApis.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformApis.create({ data: { anonRole: '<String>', config: '<JSON>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' }, select: { id: true } }).execute()
db.platformApis.update({ where: { id: '<UUID>' }, data: { anonRole: '<String>' }, select: { id: true } }).execute()
db.platformApis.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformApis records

```typescript
const items = await db.platformApis.findMany({
  select: { id: true, anonRole: true }
}).execute();
```

### Create a platformApis

```typescript
const item = await db.platformApis.create({
  data: { anonRole: '<String>', config: '<JSON>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' },
  select: { id: true }
}).execute();
```
