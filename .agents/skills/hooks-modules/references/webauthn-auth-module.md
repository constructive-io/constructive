# webauthnAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for WebauthnAuthModule data operations

## Usage

```typescript
useWebauthnAuthModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, authSettingsTableId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpiry: true } } })
useWebauthnAuthModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, authSettingsTableId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpiry: true } } })
useCreateWebauthnAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdateWebauthnAuthModuleMutation({ selection: { fields: { id: true } } })
useDeleteWebauthnAuthModuleMutation({})
```

## Examples

### List all webauthnAuthModules

```typescript
const { data, isLoading } = useWebauthnAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, authSettingsTableId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpiry: true } },
});
```

### Create a webauthnAuthModule

```typescript
const { mutate } = useCreateWebauthnAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', authSettingsTableId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpiry: '<Interval>' });
```
