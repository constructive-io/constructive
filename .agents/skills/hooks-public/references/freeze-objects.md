# freezeObjects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for freezeObjects

## Usage

```typescript
const { mutate } = useFreezeObjectsMutation(); mutate({ input: { databaseId: '<UUID>', id: '<UUID>' } });
```

## Examples

### Use useFreezeObjectsMutation

```typescript
const { mutate, isLoading } = useFreezeObjectsMutation();
mutate({ input: { databaseId: '<UUID>', id: '<UUID>' } });
```
