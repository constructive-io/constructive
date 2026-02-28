# hooks-fieldModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FieldModule data operations

## Usage

```typescript
useFieldModulesQuery({ selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } } })
useFieldModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } } })
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
mutate({ databaseId: '<value>', privateSchemaId: '<value>', tableId: '<value>', fieldId: '<value>', nodeType: '<value>', data: '<value>', triggers: '<value>', functions: '<value>' });
```
