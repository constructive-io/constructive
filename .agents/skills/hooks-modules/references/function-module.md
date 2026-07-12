# functionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FunctionModule data operations

## Usage

```typescript
useFunctionModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, definitionsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } } })
useFunctionModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, definitionsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } } })
useCreateFunctionModuleMutation({ selection: { fields: { id: true } } })
useUpdateFunctionModuleMutation({ selection: { fields: { id: true } } })
useDeleteFunctionModuleMutation({})
```

## Examples

### List all functionModules

```typescript
const { data, isLoading } = useFunctionModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, definitionsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});
```

### Create a functionModule

```typescript
const { mutate } = useCreateFunctionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', definitionsTableId: '<UUID>', definitionsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```
