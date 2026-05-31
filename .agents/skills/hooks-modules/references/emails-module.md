# emailsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EmailsModule data operations

## Usage

```typescript
useEmailsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } } })
useEmailsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } } })
useCreateEmailsModuleMutation({ selection: { fields: { id: true } } })
useUpdateEmailsModuleMutation({ selection: { fields: { id: true } } })
useDeleteEmailsModuleMutation({})
```

## Examples

### List all emailsModules

```typescript
const { data, isLoading } = useEmailsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});
```

### Create a emailsModule

```typescript
const { mutate } = useCreateEmailsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
