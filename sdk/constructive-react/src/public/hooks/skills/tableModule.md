# hooks-tableModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TableModule data operations

## Usage

```typescript
useTableModulesQuery({ selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, nodeType: true, data: true, fields: true } } })
useTableModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, nodeType: true, data: true, fields: true } } })
useCreateTableModuleMutation({ selection: { fields: { id: true } } })
useUpdateTableModuleMutation({ selection: { fields: { id: true } } })
useDeleteTableModuleMutation({})
```

## Examples

### List all tableModules

```typescript
const { data, isLoading } = useTableModulesQuery({
  selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, nodeType: true, data: true, fields: true } },
});
```

### Create a tableModule

```typescript
const { mutate } = useCreateTableModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', privateSchemaId: '<value>', tableId: '<value>', nodeType: '<value>', data: '<value>', fields: '<value>' });
```
