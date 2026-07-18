# denormalizedTableField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DenormalizedTableField data operations

## Usage

```typescript
useDenormalizedTableFieldsQuery({ selection: { fields: { databaseId: true, fieldId: true, funcName: true, funcOrder: true, id: true, refFieldId: true, refIds: true, refTableId: true, setIds: true, tableId: true, updateDefaults: true, useUpdates: true } } })
useDenormalizedTableFieldQuery({ id: '<UUID>', selection: { fields: { databaseId: true, fieldId: true, funcName: true, funcOrder: true, id: true, refFieldId: true, refIds: true, refTableId: true, setIds: true, tableId: true, updateDefaults: true, useUpdates: true } } })
useCreateDenormalizedTableFieldMutation({ selection: { fields: { id: true } } })
useUpdateDenormalizedTableFieldMutation({ selection: { fields: { id: true } } })
useDeleteDenormalizedTableFieldMutation({})
```

## Examples

### List all denormalizedTableFields

```typescript
const { data, isLoading } = useDenormalizedTableFieldsQuery({
  selection: { fields: { databaseId: true, fieldId: true, funcName: true, funcOrder: true, id: true, refFieldId: true, refIds: true, refTableId: true, setIds: true, tableId: true, updateDefaults: true, useUpdates: true } },
});
```

### Create a denormalizedTableField

```typescript
const { mutate } = useCreateDenormalizedTableFieldMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', fieldId: '<UUID>', funcName: '<String>', funcOrder: '<Int>', refFieldId: '<UUID>', refIds: '<UUID>', refTableId: '<UUID>', setIds: '<UUID>', tableId: '<UUID>', updateDefaults: '<Boolean>', useUpdates: '<Boolean>' });
```
