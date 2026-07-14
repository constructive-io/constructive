# cryptoAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CryptoAuthModule data operations

## Usage

```typescript
useCryptoAuthModulesQuery({ selection: { fields: { addressesTableId: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, secretsTableId: true, sessionCredentialsTableId: true, sessionsTableId: true, signInRecordFailure: true, signInRequestChallenge: true, signInWithChallenge: true, signUpWithKey: true, userField: true, usersTableId: true } } })
useCryptoAuthModuleQuery({ id: '<UUID>', selection: { fields: { addressesTableId: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, secretsTableId: true, sessionCredentialsTableId: true, sessionsTableId: true, signInRecordFailure: true, signInRequestChallenge: true, signInWithChallenge: true, signUpWithKey: true, userField: true, usersTableId: true } } })
useCreateCryptoAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdateCryptoAuthModuleMutation({ selection: { fields: { id: true } } })
useDeleteCryptoAuthModuleMutation({})
```

## Examples

### List all cryptoAuthModules

```typescript
const { data, isLoading } = useCryptoAuthModulesQuery({
  selection: { fields: { addressesTableId: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, secretsTableId: true, sessionCredentialsTableId: true, sessionsTableId: true, signInRecordFailure: true, signInRequestChallenge: true, signInWithChallenge: true, signUpWithKey: true, userField: true, usersTableId: true } },
});
```

### Create a cryptoAuthModule

```typescript
const { mutate } = useCreateCryptoAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ addressesTableId: '<UUID>', cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', secretsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', signInRecordFailure: '<String>', signInRequestChallenge: '<String>', signInWithChallenge: '<String>', signUpWithKey: '<String>', userField: '<String>', usersTableId: '<UUID>' });
```
