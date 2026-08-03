# platformFunctionCapabilityBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Capability bindings — declarative grants of typed resource capabilities (buckets) to function/graph holders per lifecycle

## Usage

```typescript
db.platformFunctionCapabilityBinding.findMany({ select: { id: true } }).execute()
db.platformFunctionCapabilityBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionCapabilityBinding.create({ data: { bucketId: '<UUID>', functionId: '<UUID>', graphId: '<UUID>', key: '<String>', lifecycle: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute()
db.platformFunctionCapabilityBinding.update({ where: { id: '<UUID>' }, data: { bucketId: '<UUID>' }, select: { id: true } }).execute()
db.platformFunctionCapabilityBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionCapabilityBinding records

```typescript
const items = await db.platformFunctionCapabilityBinding.findMany({
  select: { id: true, bucketId: true }
}).execute();
```

### Create a platformFunctionCapabilityBinding

```typescript
const item = await db.platformFunctionCapabilityBinding.create({
  data: { bucketId: '<UUID>', functionId: '<UUID>', graphId: '<UUID>', key: '<String>', lifecycle: '<String>', metadata: '<JSON>' },
  select: { id: true }
}).execute();
```
