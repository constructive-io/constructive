# cryptoAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CryptoAuthModule data operations

## Usage

```typescript
useCryptoAuthModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true, userFieldTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, signInRequestChallengeTrgmSimilarity: true, signInRecordFailureTrgmSimilarity: true, signUpWithKeyTrgmSimilarity: true, signInWithChallengeTrgmSimilarity: true, searchScore: true } } })
useCryptoAuthModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true, userFieldTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, signInRequestChallengeTrgmSimilarity: true, signInRecordFailureTrgmSimilarity: true, signUpWithKeyTrgmSimilarity: true, signInWithChallengeTrgmSimilarity: true, searchScore: true } } })
useCreateCryptoAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdateCryptoAuthModuleMutation({ selection: { fields: { id: true } } })
useDeleteCryptoAuthModuleMutation({})
```

## Examples

### List all cryptoAuthModules

```typescript
const { data, isLoading } = useCryptoAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true, userFieldTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, signInRequestChallengeTrgmSimilarity: true, signInRecordFailureTrgmSimilarity: true, signUpWithKeyTrgmSimilarity: true, signInWithChallengeTrgmSimilarity: true, searchScore: true } },
});
```

### Create a cryptoAuthModule

```typescript
const { mutate } = useCreateCryptoAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', usersTableId: '<value>', secretsTableId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', addressesTableId: '<value>', userField: '<value>', cryptoNetwork: '<value>', signInRequestChallenge: '<value>', signInRecordFailure: '<value>', signUpWithKey: '<value>', signInWithChallenge: '<value>', userFieldTrgmSimilarity: '<value>', cryptoNetworkTrgmSimilarity: '<value>', signInRequestChallengeTrgmSimilarity: '<value>', signInRecordFailureTrgmSimilarity: '<value>', signUpWithKeyTrgmSimilarity: '<value>', signInWithChallengeTrgmSimilarity: '<value>', searchScore: '<value>' });
```
