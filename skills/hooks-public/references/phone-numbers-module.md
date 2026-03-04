# phoneNumbersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PhoneNumbersModule data operations

## Usage

```typescript
usePhoneNumbersModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } } })
usePhoneNumbersModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } } })
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
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' });
```
