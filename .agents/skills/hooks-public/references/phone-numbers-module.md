# phoneNumbersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PhoneNumbersModule data operations

## Usage

```typescript
usePhoneNumbersModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } } })
usePhoneNumbersModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } } })
useCreatePhoneNumbersModuleMutation({ selection: { fields: { id: true } } })
useUpdatePhoneNumbersModuleMutation({ selection: { fields: { id: true } } })
useDeletePhoneNumbersModuleMutation({})
```

## Examples

### List all phoneNumbersModules

```typescript
const { data, isLoading } = usePhoneNumbersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});
```

### Create a phoneNumbersModule

```typescript
const { mutate } = useCreatePhoneNumbersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' });
```
