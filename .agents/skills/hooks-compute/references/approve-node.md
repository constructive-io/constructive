# approveNode

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for approveNode

## Usage

```typescript
const { mutate } = useApproveNodeMutation(); mutate({ input: { approved: '<Boolean>', executionId: '<UUID>', feedback: '<JSON>', nodeName: '<String>' } });
```

## Examples

### Use useApproveNodeMutation

```typescript
const { mutate, isLoading } = useApproveNodeMutation();
mutate({ input: { approved: '<Boolean>', executionId: '<UUID>', feedback: '<JSON>', nodeName: '<String>' } });
```
