# namespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
db.namespace.findMany({ select: { id: true } }).execute()
db.namespace.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.namespace.create({ data: { name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', isManaged: '<Boolean>' }, select: { id: true } }).execute()
db.namespace.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.namespace.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all namespace records

```typescript
const items = await db.namespace.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a namespace

```typescript
const item = await db.namespace.create({
  data: { name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', isManaged: '<Boolean>' },
  select: { id: true }
}).execute();
```
