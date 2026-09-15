# suspendDatabase

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for suspendDatabase

## Usage

```typescript
const { mutate } = useSuspendDatabaseMutation(); mutate({ input: { databaseId: '<UUID>', reason: '<String>' } });
```

## Examples

### Use useSuspendDatabaseMutation

```typescript
const { mutate, isLoading } = useSuspendDatabaseMutation();
mutate({ input: { databaseId: '<UUID>', reason: '<String>' } });
```
