# configSecretsOrgModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the config_secrets_org_module, which provisions an organization-scoped encrypted key-value secrets store with manage_secrets permission and entity-membership RLS.

## Usage

```typescript
useConfigSecretsOrgModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } } })
useConfigSecretsOrgModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateConfigSecretsOrgModuleMutation({ selection: { fields: { id: true } } })
useUpdateConfigSecretsOrgModuleMutation({ selection: { fields: { id: true } } })
useDeleteConfigSecretsOrgModuleMutation({})
```

## Examples

### List all configSecretsOrgModules

```typescript
const { data, isLoading } = useConfigSecretsOrgModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a configSecretsOrgModule

```typescript
const { mutate } = useCreateConfigSecretsOrgModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
