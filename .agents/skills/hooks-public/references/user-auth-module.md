# userAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserAuthModule data operations

## Usage

```typescript
useUserAuthModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true } } })
useUserAuthModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true } } })
useCreateUserAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdateUserAuthModuleMutation({ selection: { fields: { id: true } } })
useDeleteUserAuthModuleMutation({})
```

## Examples

### List all userAuthModules

```typescript
const { data, isLoading } = useUserAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true } },
});
```

### Create a userAuthModule

```typescript
const { mutate } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', encryptedTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', auditsTableName: '<String>', signInFunction: '<String>', signUpFunction: '<String>', signOutFunction: '<String>', setPasswordFunction: '<String>', resetPasswordFunction: '<String>', forgotPasswordFunction: '<String>', sendVerificationEmailFunction: '<String>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>', checkPasswordFunction: '<String>', sendAccountDeletionEmailFunction: '<String>', deleteAccountFunction: '<String>', signInCrossOriginFunction: '<String>', requestCrossOriginTokenFunction: '<String>', extendTokenExpires: '<String>' });
```
