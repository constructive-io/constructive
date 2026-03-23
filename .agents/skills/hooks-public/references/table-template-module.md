# tableTemplateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TableTemplateModule data operations

## Usage

```typescript
useTableTemplateModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } } })
useTableTemplateModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } } })
useCreateTableTemplateModuleMutation({ selection: { fields: { id: true } } })
useUpdateTableTemplateModuleMutation({ selection: { fields: { id: true } } })
useDeleteTableTemplateModuleMutation({})
```

## Examples

### List all tableTemplateModules

```typescript
const { data, isLoading } = useTableTemplateModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } },
});
```

### Create a tableTemplateModule

```typescript
const { mutate } = useCreateTableTemplateModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', nodeType: '<String>', data: '<JSON>' });
```
