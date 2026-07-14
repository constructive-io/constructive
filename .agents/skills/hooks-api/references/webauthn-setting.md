# webauthnSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries

## Usage

```typescript
useWebauthnSettingsQuery({ selection: { fields: { attestationType: true, challengeExpirySeconds: true, credentialsSchemaId: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsSchemaId: true, sessionSecretsTableId: true, sessionsSchemaId: true, sessionsTableId: true, userFieldId: true } } })
useWebauthnSettingQuery({ id: '<UUID>', selection: { fields: { attestationType: true, challengeExpirySeconds: true, credentialsSchemaId: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsSchemaId: true, sessionSecretsTableId: true, sessionsSchemaId: true, sessionsTableId: true, userFieldId: true } } })
useCreateWebauthnSettingMutation({ selection: { fields: { id: true } } })
useUpdateWebauthnSettingMutation({ selection: { fields: { id: true } } })
useDeleteWebauthnSettingMutation({})
```

## Examples

### List all webauthnSettings

```typescript
const { data, isLoading } = useWebauthnSettingsQuery({
  selection: { fields: { attestationType: true, challengeExpirySeconds: true, credentialsSchemaId: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsSchemaId: true, sessionSecretsTableId: true, sessionsSchemaId: true, sessionsTableId: true, userFieldId: true } },
});
```

### Create a webauthnSetting

```typescript
const { mutate } = useCreateWebauthnSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ attestationType: '<String>', challengeExpirySeconds: '<BigInt>', credentialsSchemaId: '<UUID>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsSchemaId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsSchemaId: '<UUID>', sessionsTableId: '<UUID>', userFieldId: '<UUID>' });
```
