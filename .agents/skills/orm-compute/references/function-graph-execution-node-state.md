# functionGraphExecutionNodeState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-node execution state — tracks individual node lifecycle for debugging

## Usage

```typescript
db.functionGraphExecutionNodeState.findMany({ select: { id: true } }).execute()
db.functionGraphExecutionNodeState.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphExecutionNodeState.create({ data: { callbackInputs: '<JSON>', callbackMeta: '<JSON>', callbackTokenHash: '<String>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>' }, select: { id: true } }).execute()
db.functionGraphExecutionNodeState.update({ where: { id: '<UUID>' }, data: { callbackInputs: '<JSON>' }, select: { id: true } }).execute()
db.functionGraphExecutionNodeState.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphExecutionNodeState records

```typescript
const items = await db.functionGraphExecutionNodeState.findMany({
  select: { id: true, callbackInputs: true }
}).execute();
```

### Create a functionGraphExecutionNodeState

```typescript
const item = await db.functionGraphExecutionNodeState.create({
  data: { callbackInputs: '<JSON>', callbackMeta: '<JSON>', callbackTokenHash: '<String>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>' },
  select: { id: true }
}).execute();
```
