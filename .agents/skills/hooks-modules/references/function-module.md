# functionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FunctionModule data operations

## Usage

```typescript
useFunctionModulesQuery({ selection: { fields: { apiName: true, bindingsTableId: true, bindingsTableName: true, databaseId: true, defaultPermissions: true, definitionsTableId: true, definitionsTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useFunctionModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, bindingsTableId: true, bindingsTableName: true, databaseId: true, defaultPermissions: true, definitionsTableId: true, definitionsTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateFunctionModuleMutation({ selection: { fields: { id: true } } })
useUpdateFunctionModuleMutation({ selection: { fields: { id: true } } })
useDeleteFunctionModuleMutation({})
```

## Examples

### List all functionModules

```typescript
const { data, isLoading } = useFunctionModulesQuery({
  selection: { fields: { apiName: true, bindingsTableId: true, bindingsTableName: true, databaseId: true, defaultPermissions: true, definitionsTableId: true, definitionsTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a functionModule

```typescript
const { mutate } = useCreateFunctionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', bindingsTableId: '<UUID>', bindingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', definitionsTableId: '<UUID>', definitionsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
