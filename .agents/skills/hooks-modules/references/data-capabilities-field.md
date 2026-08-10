# dataCapabilitiesField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DataCapabilitiesField data operations

## Usage

```typescript
useDataCapabilitiesFieldsQuery({ selection: { fields: { capabilitiesModuleId: true, databaseId: true, fieldId: true, fromFieldId: true, id: true, mappingFieldId: true, mappingKeyFieldId: true, mappingTableId: true, mode: true, subsetGuard: true, tableId: true } } })
useDataCapabilitiesFieldQuery({ id: '<UUID>', selection: { fields: { capabilitiesModuleId: true, databaseId: true, fieldId: true, fromFieldId: true, id: true, mappingFieldId: true, mappingKeyFieldId: true, mappingTableId: true, mode: true, subsetGuard: true, tableId: true } } })
useCreateDataCapabilitiesFieldMutation({ selection: { fields: { id: true } } })
useUpdateDataCapabilitiesFieldMutation({ selection: { fields: { id: true } } })
useDeleteDataCapabilitiesFieldMutation({})
```

## Examples

### List all dataCapabilitiesFields

```typescript
const { data, isLoading } = useDataCapabilitiesFieldsQuery({
  selection: { fields: { capabilitiesModuleId: true, databaseId: true, fieldId: true, fromFieldId: true, id: true, mappingFieldId: true, mappingKeyFieldId: true, mappingTableId: true, mode: true, subsetGuard: true, tableId: true } },
});
```

### Create a dataCapabilitiesField

```typescript
const { mutate } = useCreateDataCapabilitiesFieldMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilitiesModuleId: '<UUID>', databaseId: '<UUID>', fieldId: '<UUID>', fromFieldId: '<UUID>', mappingFieldId: '<UUID>', mappingKeyFieldId: '<UUID>', mappingTableId: '<UUID>', mode: '<String>', subsetGuard: '<Boolean>', tableId: '<UUID>' });
```
