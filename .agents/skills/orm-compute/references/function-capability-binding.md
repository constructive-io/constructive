# functionCapabilityBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Capability bindings — declarative grants of typed resource capabilities (buckets) to function/graph holders per lifecycle

## Usage

```typescript
db.functionCapabilityBinding.findMany({ select: { id: true } }).execute()
db.functionCapabilityBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionCapabilityBinding.create({ data: { bucketId: '<UUID>', databaseId: '<UUID>', functionId: '<UUID>', graphId: '<UUID>', key: '<String>', lifecycle: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute()
db.functionCapabilityBinding.update({ where: { id: '<UUID>' }, data: { bucketId: '<UUID>' }, select: { id: true } }).execute()
db.functionCapabilityBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionCapabilityBinding records

```typescript
const items = await db.functionCapabilityBinding.findMany({
  select: { id: true, bucketId: true }
}).execute();
```

### Create a functionCapabilityBinding

```typescript
const item = await db.functionCapabilityBinding.create({
  data: { bucketId: '<UUID>', databaseId: '<UUID>', functionId: '<UUID>', graphId: '<UUID>', key: '<String>', lifecycle: '<String>', metadata: '<JSON>' },
  select: { id: true }
}).execute();
```
