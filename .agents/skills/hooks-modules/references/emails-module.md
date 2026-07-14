# emailsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EmailsModule data operations

## Usage

```typescript
useEmailsModulesQuery({ selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useEmailsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateEmailsModuleMutation({ selection: { fields: { id: true } } })
useUpdateEmailsModuleMutation({ selection: { fields: { id: true } } })
useDeleteEmailsModuleMutation({})
```

## Examples

### List all emailsModules

```typescript
const { data, isLoading } = useEmailsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a emailsModule

```typescript
const { mutate } = useCreateEmailsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
