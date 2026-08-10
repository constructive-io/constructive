# scopeTypesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ScopeTypesModule data operations

## Usage

```typescript
useScopeTypesModulesQuery({ selection: { fields: { databaseId: true, id: true, privateSchemaName: true, schemaId: true, scopeTypesTableId: true } } })
useScopeTypesModuleQuery({ id: '<UUID>', selection: { fields: { databaseId: true, id: true, privateSchemaName: true, schemaId: true, scopeTypesTableId: true } } })
useCreateScopeTypesModuleMutation({ selection: { fields: { id: true } } })
useUpdateScopeTypesModuleMutation({ selection: { fields: { id: true } } })
useDeleteScopeTypesModuleMutation({})
```

## Examples

### List all scopeTypesModules

```typescript
const { data, isLoading } = useScopeTypesModulesQuery({
  selection: { fields: { databaseId: true, id: true, privateSchemaName: true, schemaId: true, scopeTypesTableId: true } },
});
```

### Create a scopeTypesModule

```typescript
const { mutate } = useCreateScopeTypesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', privateSchemaName: '<String>', schemaId: '<UUID>', scopeTypesTableId: '<UUID>' });
```
