# userAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UserAuthModule data operations

## Usage

```typescript
useUserAuthModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true, auditsTableNameTrgmSimilarity: true, signInFunctionTrgmSimilarity: true, signUpFunctionTrgmSimilarity: true, signOutFunctionTrgmSimilarity: true, setPasswordFunctionTrgmSimilarity: true, resetPasswordFunctionTrgmSimilarity: true, forgotPasswordFunctionTrgmSimilarity: true, sendVerificationEmailFunctionTrgmSimilarity: true, verifyEmailFunctionTrgmSimilarity: true, verifyPasswordFunctionTrgmSimilarity: true, checkPasswordFunctionTrgmSimilarity: true, sendAccountDeletionEmailFunctionTrgmSimilarity: true, deleteAccountFunctionTrgmSimilarity: true, signInOneTimeTokenFunctionTrgmSimilarity: true, oneTimeTokenFunctionTrgmSimilarity: true, extendTokenExpiresTrgmSimilarity: true, searchScore: true } } })
useUserAuthModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true, auditsTableNameTrgmSimilarity: true, signInFunctionTrgmSimilarity: true, signUpFunctionTrgmSimilarity: true, signOutFunctionTrgmSimilarity: true, setPasswordFunctionTrgmSimilarity: true, resetPasswordFunctionTrgmSimilarity: true, forgotPasswordFunctionTrgmSimilarity: true, sendVerificationEmailFunctionTrgmSimilarity: true, verifyEmailFunctionTrgmSimilarity: true, verifyPasswordFunctionTrgmSimilarity: true, checkPasswordFunctionTrgmSimilarity: true, sendAccountDeletionEmailFunctionTrgmSimilarity: true, deleteAccountFunctionTrgmSimilarity: true, signInOneTimeTokenFunctionTrgmSimilarity: true, oneTimeTokenFunctionTrgmSimilarity: true, extendTokenExpiresTrgmSimilarity: true, searchScore: true } } })
useCreateUserAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdateUserAuthModuleMutation({ selection: { fields: { id: true } } })
useDeleteUserAuthModuleMutation({})
```

## Examples

### List all userAuthModules

```typescript
const { data, isLoading } = useUserAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true, auditsTableNameTrgmSimilarity: true, signInFunctionTrgmSimilarity: true, signUpFunctionTrgmSimilarity: true, signOutFunctionTrgmSimilarity: true, setPasswordFunctionTrgmSimilarity: true, resetPasswordFunctionTrgmSimilarity: true, forgotPasswordFunctionTrgmSimilarity: true, sendVerificationEmailFunctionTrgmSimilarity: true, verifyEmailFunctionTrgmSimilarity: true, verifyPasswordFunctionTrgmSimilarity: true, checkPasswordFunctionTrgmSimilarity: true, sendAccountDeletionEmailFunctionTrgmSimilarity: true, deleteAccountFunctionTrgmSimilarity: true, signInOneTimeTokenFunctionTrgmSimilarity: true, oneTimeTokenFunctionTrgmSimilarity: true, extendTokenExpiresTrgmSimilarity: true, searchScore: true } },
});
```

### Create a userAuthModule

```typescript
const { mutate } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', secretsTableId: '<value>', encryptedTableId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', auditsTableId: '<value>', auditsTableName: '<value>', signInFunction: '<value>', signUpFunction: '<value>', signOutFunction: '<value>', setPasswordFunction: '<value>', resetPasswordFunction: '<value>', forgotPasswordFunction: '<value>', sendVerificationEmailFunction: '<value>', verifyEmailFunction: '<value>', verifyPasswordFunction: '<value>', checkPasswordFunction: '<value>', sendAccountDeletionEmailFunction: '<value>', deleteAccountFunction: '<value>', signInOneTimeTokenFunction: '<value>', oneTimeTokenFunction: '<value>', extendTokenExpires: '<value>', auditsTableNameTrgmSimilarity: '<value>', signInFunctionTrgmSimilarity: '<value>', signUpFunctionTrgmSimilarity: '<value>', signOutFunctionTrgmSimilarity: '<value>', setPasswordFunctionTrgmSimilarity: '<value>', resetPasswordFunctionTrgmSimilarity: '<value>', forgotPasswordFunctionTrgmSimilarity: '<value>', sendVerificationEmailFunctionTrgmSimilarity: '<value>', verifyEmailFunctionTrgmSimilarity: '<value>', verifyPasswordFunctionTrgmSimilarity: '<value>', checkPasswordFunctionTrgmSimilarity: '<value>', sendAccountDeletionEmailFunctionTrgmSimilarity: '<value>', deleteAccountFunctionTrgmSimilarity: '<value>', signInOneTimeTokenFunctionTrgmSimilarity: '<value>', oneTimeTokenFunctionTrgmSimilarity: '<value>', extendTokenExpiresTrgmSimilarity: '<value>', searchScore: '<value>' });
```
