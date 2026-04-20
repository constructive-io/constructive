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
csdk user-auth-module create --databaseId <UUID> [--schemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--secretsTableId <UUID>] [--encryptedTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--signInFunction <String>] [--signUpFunction <String>] [--signOutFunction <String>] [--setPasswordFunction <String>] [--resetPasswordFunction <String>] [--forgotPasswordFunction <String>] [--sendVerificationEmailFunction <String>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>] [--checkPasswordFunction <String>] [--sendAccountDeletionEmailFunction <String>] [--deleteAccountFunction <String>] [--signInCrossOriginFunction <String>] [--requestCrossOriginTokenFunction <String>] [--extendTokenExpires <String>]
csdk user-auth-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--secretsTableId <UUID>] [--encryptedTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--signInFunction <String>] [--signUpFunction <String>] [--signOutFunction <String>] [--setPasswordFunction <String>] [--resetPasswordFunction <String>] [--forgotPasswordFunction <String>] [--sendVerificationEmailFunction <String>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>] [--checkPasswordFunction <String>] [--sendAccountDeletionEmailFunction <String>] [--deleteAccountFunction <String>] [--signInCrossOriginFunction <String>] [--requestCrossOriginTokenFunction <String>] [--extendTokenExpires <String>]
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
csdk user-auth-module create --databaseId <UUID> [--schemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--secretsTableId <UUID>] [--encryptedTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--auditsTableId <UUID>] [--auditsTableName <String>] [--signInFunction <String>] [--signUpFunction <String>] [--signOutFunction <String>] [--setPasswordFunction <String>] [--resetPasswordFunction <String>] [--forgotPasswordFunction <String>] [--sendVerificationEmailFunction <String>] [--verifyEmailFunction <String>] [--verifyPasswordFunction <String>] [--checkPasswordFunction <String>] [--sendAccountDeletionEmailFunction <String>] [--deleteAccountFunction <String>] [--signInCrossOriginFunction <String>] [--requestCrossOriginTokenFunction <String>] [--extendTokenExpires <String>]
```

### Get a userAuthModule by id

```bash
csdk user-auth-module get --id <value>
```
