# configSecretsUserModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ConfigSecretsUserModule data operations

## Usage

```typescript
useConfigSecretsUserModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } } })
useConfigSecretsUserModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } } })
useCreateConfigSecretsUserModuleMutation({ selection: { fields: { id: true } } })
useUpdateConfigSecretsUserModuleMutation({ selection: { fields: { id: true } } })
useDeleteConfigSecretsUserModuleMutation({})
```

## Examples

### List all configSecretsUserModules

```typescript
const { data, isLoading } = useConfigSecretsUserModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } },
});
```

### Create a configSecretsUserModule

```typescript
const { mutate } = useCreateConfigSecretsUserModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
