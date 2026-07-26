# pubkeySetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Public-key crypto auth runtime configuration; typed references to the crypto sign-up/sign-in function plumbing

## Usage

```typescript
usePubkeySettingsQuery({ selection: { fields: { createdAt: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, updatedAt: true, userField: true } } })
usePubkeySettingQuery({ id: '<UUID>', selection: { fields: { createdAt: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, updatedAt: true, userField: true } } })
useCreatePubkeySettingMutation({ selection: { fields: { id: true } } })
useUpdatePubkeySettingMutation({ selection: { fields: { id: true } } })
useDeletePubkeySettingMutation({})
```

## Examples

### List all pubkeySettings

```typescript
const { data, isLoading } = usePubkeySettingsQuery({
  selection: { fields: { createdAt: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, updatedAt: true, userField: true } },
});
```

### Create a pubkeySetting

```typescript
const { mutate } = useCreatePubkeySettingMutation({
  selection: { fields: { id: true } },
});
mutate({ cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>', signUpWithKeyFunctionId: '<UUID>', userField: '<String>' });
```
