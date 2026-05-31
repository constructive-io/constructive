# webauthnSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries

## Usage

```typescript
useWebauthnSettingsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, credentialsSchemaId: true, sessionsSchemaId: true, sessionSecretsSchemaId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, userFieldId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpirySeconds: true } } })
useWebauthnSettingQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, credentialsSchemaId: true, sessionsSchemaId: true, sessionSecretsSchemaId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, userFieldId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpirySeconds: true } } })
useCreateWebauthnSettingMutation({ selection: { fields: { id: true } } })
useUpdateWebauthnSettingMutation({ selection: { fields: { id: true } } })
useDeleteWebauthnSettingMutation({})
```

## Examples

### List all webauthnSettings

```typescript
const { data, isLoading } = useWebauthnSettingsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, credentialsSchemaId: true, sessionsSchemaId: true, sessionSecretsSchemaId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, userFieldId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpirySeconds: true } },
});
```

### Create a webauthnSetting

```typescript
const { mutate } = useCreateWebauthnSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', credentialsSchemaId: '<UUID>', sessionsSchemaId: '<UUID>', sessionSecretsSchemaId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', userFieldId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpirySeconds: '<BigInt>' });
```
