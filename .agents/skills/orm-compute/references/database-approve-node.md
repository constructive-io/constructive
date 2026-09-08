# databaseApproveNode

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the databaseApproveNode mutation

## Usage

```typescript
db.mutation.databaseApproveNode({ input: { approved: '<Boolean>', executionId: '<UUID>', feedback: '<JSON>', nodeName: '<String>' } }).execute()
```

## Examples

### Run databaseApproveNode

```typescript
const result = await db.mutation.databaseApproveNode({ input: { approved: '<Boolean>', executionId: '<UUID>', feedback: '<JSON>', nodeName: '<String>' } }).execute();
```
