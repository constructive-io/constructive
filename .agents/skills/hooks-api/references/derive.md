# derive

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Derive data operations

## Usage

```typescript
useDerivesQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, includeMutations: true, kind: true, policyPrefix: true, sourceTableId: true, tableId: true, updatedAt: true } } })
useDeriveQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, includeMutations: true, kind: true, policyPrefix: true, sourceTableId: true, tableId: true, updatedAt: true } } })
useCreateDeriveMutation({ selection: { fields: { id: true } } })
useUpdateDeriveMutation({ selection: { fields: { id: true } } })
useDeleteDeriveMutation({})
```

## Examples

### List all derives

```typescript
const { data, isLoading } = useDerivesQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, includeMutations: true, kind: true, policyPrefix: true, sourceTableId: true, tableId: true, updatedAt: true } },
});
```

### Create a derive

```typescript
const { mutate } = useCreateDeriveMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', includeMutations: '<Boolean>', kind: '<String>', policyPrefix: '<String>', sourceTableId: '<UUID>', tableId: '<UUID>' });
```
