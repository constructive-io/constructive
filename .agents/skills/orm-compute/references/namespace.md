# namespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
db.namespace.findMany({ select: { id: true } }).execute()
db.namespace.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.namespace.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' }, select: { id: true } }).execute()
db.namespace.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.namespace.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all namespace records

```typescript
const items = await db.namespace.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a namespace

```typescript
const item = await db.namespace.create({
  data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' },
  select: { id: true }
}).execute();
```
