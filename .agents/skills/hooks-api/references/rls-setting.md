# rlsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries

## Usage

```typescript
useRlsSettingsQuery({ selection: { fields: { id: true, databaseId: true, authenticateSchemaId: true, roleSchemaId: true, authenticateFunctionId: true, authenticateStrictFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, currentIpAddressFunctionId: true } } })
useRlsSettingQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, authenticateSchemaId: true, roleSchemaId: true, authenticateFunctionId: true, authenticateStrictFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, currentIpAddressFunctionId: true } } })
useCreateRlsSettingMutation({ selection: { fields: { id: true } } })
useUpdateRlsSettingMutation({ selection: { fields: { id: true } } })
useDeleteRlsSettingMutation({})
```

## Examples

### List all rlsSettings

```typescript
const { data, isLoading } = useRlsSettingsQuery({
  selection: { fields: { id: true, databaseId: true, authenticateSchemaId: true, roleSchemaId: true, authenticateFunctionId: true, authenticateStrictFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, currentIpAddressFunctionId: true } },
});
```

### Create a rlsSetting

```typescript
const { mutate } = useCreateRlsSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', authenticateSchemaId: '<UUID>', roleSchemaId: '<UUID>', authenticateFunctionId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>' });
```
