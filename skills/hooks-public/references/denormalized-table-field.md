# denormalizedTableField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DenormalizedTableField data operations

## Usage

```typescript
useDenormalizedTableFieldsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } } })
useDenormalizedTableFieldQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } } })
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
mutate({ databaseId: '<value>', tableId: '<value>', fieldId: '<value>', setIds: '<value>', refTableId: '<value>', refFieldId: '<value>', refIds: '<value>', useUpdates: '<value>', updateDefaults: '<value>', funcName: '<value>', funcOrder: '<value>' });
```
