# platformNamespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
db.platformNamespace.findMany({ select: { id: true } }).execute()
db.platformNamespace.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformNamespace.create({ data: { annotations: '<JSON>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' }, select: { id: true } }).execute()
db.platformNamespace.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformNamespace.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformNamespace records

```typescript
const items = await db.platformNamespace.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a platformNamespace

```typescript
const item = await db.platformNamespace.create({
  data: { annotations: '<JSON>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' },
  select: { id: true }
}).execute();
```
