# rlsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries

## Usage

```typescript
useRlsSettingsQuery({ selection: { fields: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true } } })
useRlsSettingQuery({ id: '<UUID>', selection: { fields: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true } } })
useCreateRlsSettingMutation({ selection: { fields: { id: true } } })
useUpdateRlsSettingMutation({ selection: { fields: { id: true } } })
useDeleteRlsSettingMutation({})
```

## Examples

### List all rlsSettings

```typescript
const { data, isLoading } = useRlsSettingsQuery({
  selection: { fields: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true } },
});
```

### Create a rlsSetting

```typescript
const { mutate } = useCreateRlsSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ authenticateFunctionId: '<UUID>', authenticateSchemaId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', databaseId: '<UUID>', roleSchemaId: '<UUID>' });
```
