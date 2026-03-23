# denormalizedTableField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DenormalizedTableField data operations

## Usage

```typescript
useDenormalizedTableFieldsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } } })
useDenormalizedTableFieldQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } } })
useCreateDenormalizedTableFieldMutation({ selection: { fields: { id: true } } })
useUpdateDenormalizedTableFieldMutation({ selection: { fields: { id: true } } })
useDeleteDenormalizedTableFieldMutation({})
```

## Examples

### List all denormalizedTableFields

```typescript
const { data, isLoading } = useDenormalizedTableFieldsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } },
});
```

### Create a denormalizedTableField

```typescript
const { mutate } = useCreateDenormalizedTableFieldMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', setIds: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', refIds: '<UUID>', useUpdates: '<Boolean>', updateDefaults: '<Boolean>', funcName: '<String>', funcOrder: '<Int>' });
```
