# platformNamespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
db.platformNamespace.findMany({ select: { id: true } }).execute()
db.platformNamespace.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformNamespace.create({ data: { name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', sourceDatabaseId: '<UUID>', sourceScope: '<String>', isManaged: '<Boolean>' }, select: { id: true } }).execute()
db.platformNamespace.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.platformNamespace.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformNamespace records

```typescript
const items = await db.platformNamespace.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a platformNamespace

```typescript
const item = await db.platformNamespace.create({
  data: { name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', sourceDatabaseId: '<UUID>', sourceScope: '<String>', isManaged: '<Boolean>' },
  select: { id: true }
}).execute();
```
