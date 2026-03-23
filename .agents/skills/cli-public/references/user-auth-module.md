# userAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserAuthModule records via csdk CLI

## Usage

```bash
csdk user-auth-module list
csdk user-auth-module get --id <UUID>
csdk user-auth-module create --databaseId <UUID> [--schemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--secretsTableId <UUID>] [--encryptedTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--signInFunction <String>] [--signUpFunction <String>] [--signOutFunction <String>] [--setPasswordFunction <String>] [--resetPasswordFunction <String>] [--forgotPasswordFunction <String>] [--sendVerificationEmailFunction <String>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>] [--checkPasswordFunction <String>] [--sendAccountDeletionEmailFunction <String>] [--deleteAccountFunction <String>] [--signInOneTimeTokenFunction <String>] [--oneTimeTokenFunction <String>] [--extendTokenExpires <String>]
csdk user-auth-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--secretsTableId <UUID>] [--encryptedTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--signInFunction <String>] [--signUpFunction <String>] [--signOutFunction <String>] [--setPasswordFunction <String>] [--resetPasswordFunction <String>] [--forgotPasswordFunction <String>] [--sendVerificationEmailFunction <String>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>] [--checkPasswordFunction <String>] [--sendAccountDeletionEmailFunction <String>] [--deleteAccountFunction <String>] [--signInOneTimeTokenFunction <String>] [--oneTimeTokenFunction <String>] [--extendTokenExpires <String>]
csdk user-auth-module delete --id <UUID>
```

## Examples

### List all userAuthModule records

```bash
csdk user-auth-module list
```

### Create a userAuthModule

```bash
csdk user-auth-module create --databaseId <UUID> [--schemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--secretsTableId <UUID>] [--encryptedTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--signInFunction <String>] [--signUpFunction <String>] [--signOutFunction <String>] [--setPasswordFunction <String>] [--resetPasswordFunction <String>] [--forgotPasswordFunction <String>] [--sendVerificationEmailFunction <String>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>] [--checkPasswordFunction <String>] [--sendAccountDeletionEmailFunction <String>] [--deleteAccountFunction <String>] [--signInOneTimeTokenFunction <String>] [--oneTimeTokenFunction <String>] [--extendTokenExpires <String>]
```

### Get a userAuthModule by id

```bash
csdk user-auth-module get --id <value>
```
