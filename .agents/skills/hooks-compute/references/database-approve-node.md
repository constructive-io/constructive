# databaseApproveNode

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for databaseApproveNode

## Usage

```typescript
const { mutate } = useDatabaseApproveNodeMutation(); mutate({ input: { approved: '<Boolean>', executionId: '<UUID>', feedback: '<JSON>', nodeName: '<String>' } });
```

## Examples

### Use useDatabaseApproveNodeMutation

```typescript
const { mutate, isLoading } = useDatabaseApproveNodeMutation();
mutate({ input: { approved: '<Boolean>', executionId: '<UUID>', feedback: '<JSON>', nodeName: '<String>' } });
```
