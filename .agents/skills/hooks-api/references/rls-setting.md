# rlsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

RLS module runtime configuration; typed references to the authenticate/current_role function plumbing

## Usage

```typescript
useRlsSettingsQuery({ selection: { fields: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, createdAt: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true, updatedAt: true } } })
useRlsSettingQuery({ id: '<UUID>', selection: { fields: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, createdAt: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true, updatedAt: true } } })
useCreateRlsSettingMutation({ selection: { fields: { id: true } } })
useUpdateRlsSettingMutation({ selection: { fields: { id: true } } })
useDeleteRlsSettingMutation({})
```

## Examples

### List all rlsSettings

```typescript
const { data, isLoading } = useRlsSettingsQuery({
  selection: { fields: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, createdAt: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true, updatedAt: true } },
});
```

### Create a rlsSetting

```typescript
const { mutate } = useCreateRlsSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ authenticateFunctionId: '<UUID>', authenticateSchemaId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', databaseId: '<UUID>', roleSchemaId: '<UUID>' });
```
