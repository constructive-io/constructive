# functionGraphExecutionOutput

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed store for execution outputs — hash-referenced from node_outputs

## Usage

```typescript
db.functionGraphExecutionOutput.findMany({ select: { id: true } }).execute()
db.functionGraphExecutionOutput.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphExecutionOutput.create({ data: { data: '<JSON>', hash: '<Base64EncodedBinary>', scopeId: '<UUID>' }, select: { id: true } }).execute()
db.functionGraphExecutionOutput.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.functionGraphExecutionOutput.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphExecutionOutput records

```typescript
const items = await db.functionGraphExecutionOutput.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a functionGraphExecutionOutput

```typescript
const item = await db.functionGraphExecutionOutput.create({
  data: { data: '<JSON>', hash: '<Base64EncodedBinary>', scopeId: '<UUID>' },
  select: { id: true }
}).execute();
```
