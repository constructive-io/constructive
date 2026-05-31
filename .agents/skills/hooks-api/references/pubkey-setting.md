# pubkeySetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries

## Usage

```typescript
usePubkeySettingsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, cryptoNetwork: true, userField: true, signUpWithKeyFunctionId: true, signInRequestChallengeFunctionId: true, signInRecordFailureFunctionId: true, signInWithChallengeFunctionId: true } } })
usePubkeySettingQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, cryptoNetwork: true, userField: true, signUpWithKeyFunctionId: true, signInRequestChallengeFunctionId: true, signInRecordFailureFunctionId: true, signInWithChallengeFunctionId: true } } })
useCreatePubkeySettingMutation({ selection: { fields: { id: true } } })
useUpdatePubkeySettingMutation({ selection: { fields: { id: true } } })
useDeletePubkeySettingMutation({})
```

## Examples

### List all pubkeySettings

```typescript
const { data, isLoading } = usePubkeySettingsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, cryptoNetwork: true, userField: true, signUpWithKeyFunctionId: true, signInRequestChallengeFunctionId: true, signInRecordFailureFunctionId: true, signInWithChallengeFunctionId: true } },
});
```

### Create a pubkeySetting

```typescript
const { mutate } = useCreatePubkeySettingMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', cryptoNetwork: '<String>', userField: '<String>', signUpWithKeyFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>' });
```
