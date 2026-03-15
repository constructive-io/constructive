# tableTemplateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TableTemplateModule data operations

## Usage

```typescript
useTableTemplateModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true, tableNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, searchScore: true } } })
useTableTemplateModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true, tableNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, searchScore: true } } })
useCreateTableTemplateModuleMutation({ selection: { fields: { id: true } } })
useUpdateTableTemplateModuleMutation({ selection: { fields: { id: true } } })
useDeleteTableTemplateModuleMutation({})
```

## Examples

### List all tableTemplateModules

```typescript
const { data, isLoading } = useTableTemplateModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true, tableNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, searchScore: true } },
});
```

### Create a tableTemplateModule

```typescript
const { mutate } = useCreateTableTemplateModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', nodeType: '<value>', data: '<value>', tableNameTrgmSimilarity: '<value>', nodeTypeTrgmSimilarity: '<value>', searchScore: '<value>' });
```
