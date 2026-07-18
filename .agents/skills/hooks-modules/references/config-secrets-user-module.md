# configSecretsUserModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ConfigSecretsUserModule data operations

## Usage

```typescript
useConfigSecretsUserModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } } })
useConfigSecretsUserModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } } })
useCreateConfigSecretsUserModuleMutation({ selection: { fields: { id: true } } })
useUpdateConfigSecretsUserModuleMutation({ selection: { fields: { id: true } } })
useDeleteConfigSecretsUserModuleMutation({})
```

## Examples

### List all configSecretsUserModules

```typescript
const { data, isLoading } = useConfigSecretsUserModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a configSecretsUserModule

```typescript
const { mutate } = useCreateConfigSecretsUserModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
