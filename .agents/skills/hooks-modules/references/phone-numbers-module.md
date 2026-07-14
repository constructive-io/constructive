# phoneNumbersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PhoneNumbersModule data operations

## Usage

```typescript
usePhoneNumbersModulesQuery({ selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
usePhoneNumbersModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useCreatePhoneNumbersModuleMutation({ selection: { fields: { id: true } } })
useUpdatePhoneNumbersModuleMutation({ selection: { fields: { id: true } } })
useDeletePhoneNumbersModuleMutation({})
```

## Examples

### List all phoneNumbersModules

```typescript
const { data, isLoading } = usePhoneNumbersModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a phoneNumbersModule

```typescript
const { mutate } = useCreatePhoneNumbersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
