# pubkeySetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries

## Usage

```typescript
usePubkeySettingsQuery({ selection: { fields: { cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, userField: true } } })
usePubkeySettingQuery({ id: '<UUID>', selection: { fields: { cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, userField: true } } })
useCreatePubkeySettingMutation({ selection: { fields: { id: true } } })
useUpdatePubkeySettingMutation({ selection: { fields: { id: true } } })
useDeletePubkeySettingMutation({})
```

## Examples

### List all pubkeySettings

```typescript
const { data, isLoading } = usePubkeySettingsQuery({
  selection: { fields: { cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, userField: true } },
});
```

### Create a pubkeySetting

```typescript
const { mutate } = useCreatePubkeySettingMutation({
  selection: { fields: { id: true } },
});
mutate({ cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>', signUpWithKeyFunctionId: '<UUID>', userField: '<String>' });
```
