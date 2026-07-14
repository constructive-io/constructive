# userAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserAuthModule records via csdk CLI

## Usage

```bash
csdk user-auth-module list
csdk user-auth-module list --where.<field>.<op> <value> --orderBy <values>
csdk user-auth-module list --limit 10 --after <cursor>
csdk user-auth-module find-first --where.<field>.<op> <value>
csdk user-auth-module get --id <UUID>
csdk user-auth-module create --databaseId <UUID> [--apiName <String>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--checkPasswordFunction <String>] [--deleteAccountFunction <String>] [--emailsTableId <UUID>] [--encryptedTableId <UUID>] [--extendTokenExpires <String>] [--forgotPasswordFunction <String>] [--privateApiName <String>] [--requestCrossOriginTokenFunction <String>] [--resetPasswordFunction <String>] [--schemaId <UUID>] [--secretsTableId <UUID>] [--sendAccountDeletionEmailFunction <String>] [--sendVerificationEmailFunction <String>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--setPasswordFunction <String>] [--signInCrossOriginFunction <String>] [--signInFunction <String>] [--signOutFunction <String>] [--signUpFunction <String>] [--usersTableId <UUID>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>]
csdk user-auth-module update --id <UUID> [--apiName <String>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--checkPasswordFunction <String>] [--databaseId <UUID>] [--deleteAccountFunction <String>] [--emailsTableId <UUID>] [--encryptedTableId <UUID>] [--extendTokenExpires <String>] [--forgotPasswordFunction <String>] [--privateApiName <String>] [--requestCrossOriginTokenFunction <String>] [--resetPasswordFunction <String>] [--schemaId <UUID>] [--secretsTableId <UUID>] [--sendAccountDeletionEmailFunction <String>] [--sendVerificationEmailFunction <String>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--setPasswordFunction <String>] [--signInCrossOriginFunction <String>] [--signInFunction <String>] [--signOutFunction <String>] [--signUpFunction <String>] [--usersTableId <UUID>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>]
csdk user-auth-module delete --id <UUID>
```

## Examples

### List userAuthModule records

```bash
csdk user-auth-module list
```

### List userAuthModule records with pagination

```bash
csdk user-auth-module list --limit 10 --offset 0
```

### List userAuthModule records with cursor pagination

```bash
csdk user-auth-module list --limit 10 --after <cursor>
```

### Find first matching userAuthModule

```bash
csdk user-auth-module find-first --where.id.equalTo <value>
```

### List userAuthModule records with field selection

```bash
csdk user-auth-module list --select id,id
```

### List userAuthModule records with filtering and ordering

```bash
csdk user-auth-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a userAuthModule

```bash
csdk user-auth-module create --databaseId <UUID> [--apiName <String>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--checkPasswordFunction <String>] [--deleteAccountFunction <String>] [--emailsTableId <UUID>] [--encryptedTableId <UUID>] [--extendTokenExpires <String>] [--forgotPasswordFunction <String>] [--privateApiName <String>] [--requestCrossOriginTokenFunction <String>] [--resetPasswordFunction <String>] [--schemaId <UUID>] [--secretsTableId <UUID>] [--sendAccountDeletionEmailFunction <String>] [--sendVerificationEmailFunction <String>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--setPasswordFunction <String>] [--signInCrossOriginFunction <String>] [--signInFunction <String>] [--signOutFunction <String>] [--signUpFunction <String>] [--usersTableId <UUID>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>]
```

### Get a userAuthModule by id

```bash
csdk user-auth-module get --id <value>
```
