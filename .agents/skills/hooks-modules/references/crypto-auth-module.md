# cryptoAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CryptoAuthModule data operations

## Usage

```typescript
useCryptoAuthModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } } })
useCryptoAuthModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } } })
useCreateCryptoAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdateCryptoAuthModuleMutation({ selection: { fields: { id: true } } })
useDeleteCryptoAuthModuleMutation({})
```

## Examples

### List all cryptoAuthModules

```typescript
const { data, isLoading } = useCryptoAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } },
});
```

### Create a cryptoAuthModule

```typescript
const { mutate } = useCreateCryptoAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', addressesTableId: '<UUID>', userField: '<String>', cryptoNetwork: '<String>', signInRequestChallenge: '<String>', signInRecordFailure: '<String>', signUpWithKey: '<String>', signInWithChallenge: '<String>' });
```
