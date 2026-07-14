# webauthnAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for WebauthnAuthModule data operations

## Usage

```typescript
useWebauthnAuthModulesQuery({ selection: { fields: { attestationType: true, authSettingsTableId: true, challengeExpiry: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, sessionsTableId: true, usersTableId: true } } })
useWebauthnAuthModuleQuery({ id: '<UUID>', selection: { fields: { attestationType: true, authSettingsTableId: true, challengeExpiry: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, sessionsTableId: true, usersTableId: true } } })
useCreateWebauthnAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdateWebauthnAuthModuleMutation({ selection: { fields: { id: true } } })
useDeleteWebauthnAuthModuleMutation({})
```

## Examples

### List all webauthnAuthModules

```typescript
const { data, isLoading } = useWebauthnAuthModulesQuery({
  selection: { fields: { attestationType: true, authSettingsTableId: true, challengeExpiry: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, sessionsTableId: true, usersTableId: true } },
});
```

### Create a webauthnAuthModule

```typescript
const { mutate } = useCreateWebauthnAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ attestationType: '<String>', authSettingsTableId: '<UUID>', challengeExpiry: '<Interval>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' });
```
