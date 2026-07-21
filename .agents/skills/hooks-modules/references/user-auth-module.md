# userAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserAuthModule data operations

## Usage

```typescript
useUserAuthModulesQuery({ selection: { fields: { apiName: true, auditsTableId: true, auditsTableName: true, checkPasswordFunction: true, databaseId: true, deleteAccountFunction: true, emailsTableId: true, encryptedTableId: true, extendTokenExpires: true, forgotPasswordFunction: true, id: true, privateApiName: true, requestCrossOriginTokenFunction: true, resetPasswordFunction: true, schemaId: true, secretsTableId: true, sendAccountDeletionEmailFunction: true, sendVerificationEmailFunction: true, sessionCredentialsTableId: true, sessionsTableId: true, setPasswordFunction: true, signInCrossOriginFunction: true, signInFunction: true, signOutFunction: true, signUpFunction: true, usersTableId: true, verifyEmailFunction: true, verifyPasswordFunction: true } } })
useUserAuthModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, auditsTableId: true, auditsTableName: true, checkPasswordFunction: true, databaseId: true, deleteAccountFunction: true, emailsTableId: true, encryptedTableId: true, extendTokenExpires: true, forgotPasswordFunction: true, id: true, privateApiName: true, requestCrossOriginTokenFunction: true, resetPasswordFunction: true, schemaId: true, secretsTableId: true, sendAccountDeletionEmailFunction: true, sendVerificationEmailFunction: true, sessionCredentialsTableId: true, sessionsTableId: true, setPasswordFunction: true, signInCrossOriginFunction: true, signInFunction: true, signOutFunction: true, signUpFunction: true, usersTableId: true, verifyEmailFunction: true, verifyPasswordFunction: true } } })
useCreateUserAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdateUserAuthModuleMutation({ selection: { fields: { id: true } } })
useDeleteUserAuthModuleMutation({})
```

## Examples

### List all userAuthModules

```typescript
const { data, isLoading } = useUserAuthModulesQuery({
  selection: { fields: { apiName: true, auditsTableId: true, auditsTableName: true, checkPasswordFunction: true, databaseId: true, deleteAccountFunction: true, emailsTableId: true, encryptedTableId: true, extendTokenExpires: true, forgotPasswordFunction: true, id: true, privateApiName: true, requestCrossOriginTokenFunction: true, resetPasswordFunction: true, schemaId: true, secretsTableId: true, sendAccountDeletionEmailFunction: true, sendVerificationEmailFunction: true, sessionCredentialsTableId: true, sessionsTableId: true, setPasswordFunction: true, signInCrossOriginFunction: true, signInFunction: true, signOutFunction: true, signUpFunction: true, usersTableId: true, verifyEmailFunction: true, verifyPasswordFunction: true } },
});
```

### Create a userAuthModule

```typescript
const { mutate } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', auditsTableId: '<UUID>', auditsTableName: '<String>', checkPasswordFunction: '<String>', databaseId: '<UUID>', deleteAccountFunction: '<String>', emailsTableId: '<UUID>', encryptedTableId: '<UUID>', extendTokenExpires: '<String>', forgotPasswordFunction: '<String>', privateApiName: '<String>', requestCrossOriginTokenFunction: '<String>', resetPasswordFunction: '<String>', schemaId: '<UUID>', secretsTableId: '<UUID>', sendAccountDeletionEmailFunction: '<String>', sendVerificationEmailFunction: '<String>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', setPasswordFunction: '<String>', signInCrossOriginFunction: '<String>', signInFunction: '<String>', signOutFunction: '<String>', signUpFunction: '<String>', usersTableId: '<UUID>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>' });
```
