# fieldModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FieldModule data operations

## Usage

```typescript
useFieldModulesQuery({ selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } } })
useFieldModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } } })
useCreateFieldModuleMutation({ selection: { fields: { id: true } } })
useUpdateFieldModuleMutation({ selection: { fields: { id: true } } })
useDeleteFieldModuleMutation({})
```

## Examples

### List all fieldModules

```typescript
const { data, isLoading } = useFieldModulesQuery({
  selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } },
});
```

### Create a fieldModule

```typescript
const { mutate } = useCreateFieldModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', nodeType: '<String>', data: '<JSON>', triggers: '<String>', functions: '<String>' });
```
