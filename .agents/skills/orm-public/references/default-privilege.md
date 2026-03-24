# defaultPrivilege

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DefaultPrivilege records

## Usage

```typescript
db.defaultPrivilege.findMany({ select: { id: true } }).execute()
db.defaultPrivilege.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.defaultPrivilege.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', objectType: '<String>', privilege: '<String>', granteeName: '<String>', isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.defaultPrivilege.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.defaultPrivilege.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', schemaId: '<UUID>', objectType: '<String>', privilege: '<String>', granteeName: '<String>', isGrant: '<Boolean>' },
  select: { id: true }
}).execute();
```
