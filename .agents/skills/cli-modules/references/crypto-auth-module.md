# cryptoAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CryptoAuthModule records via csdk CLI

## Usage

```bash
csdk crypto-auth-module list
csdk crypto-auth-module list --where.<field>.<op> <value> --orderBy <values>
csdk crypto-auth-module list --limit 10 --after <cursor>
csdk crypto-auth-module find-first --where.<field>.<op> <value>
csdk crypto-auth-module get --id <UUID>
csdk crypto-auth-module create --databaseId <UUID> --userField <String> [--addressesTableId <UUID>] [--cryptoNetwork <String>] [--schemaId <UUID>] [--secretsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--signInRecordFailure <String>] [--signInRequestChallenge <String>] [--signInWithChallenge <String>] [--signUpWithKey <String>] [--usersTableId <UUID>]
csdk crypto-auth-module update --id <UUID> [--addressesTableId <UUID>] [--cryptoNetwork <String>] [--databaseId <UUID>] [--schemaId <UUID>] [--secretsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--signInRecordFailure <String>] [--signInRequestChallenge <String>] [--signInWithChallenge <String>] [--signUpWithKey <String>] [--userField <String>] [--usersTableId <UUID>]
csdk crypto-auth-module delete --id <UUID>
```

## Examples

### List cryptoAuthModule records

```bash
csdk crypto-auth-module list
```

### List cryptoAuthModule records with pagination

```bash
csdk crypto-auth-module list --limit 10 --offset 0
```

### List cryptoAuthModule records with cursor pagination

```bash
csdk crypto-auth-module list --limit 10 --after <cursor>
```

### Find first matching cryptoAuthModule

```bash
csdk crypto-auth-module find-first --where.id.equalTo <value>
```

### List cryptoAuthModule records with field selection

```bash
csdk crypto-auth-module list --select id,id
```

### List cryptoAuthModule records with filtering and ordering

```bash
csdk crypto-auth-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a cryptoAuthModule

```bash
csdk crypto-auth-module create --databaseId <UUID> --userField <String> [--addressesTableId <UUID>] [--cryptoNetwork <String>] [--schemaId <UUID>] [--secretsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--signInRecordFailure <String>] [--signInRequestChallenge <String>] [--signInWithChallenge <String>] [--signUpWithKey <String>] [--usersTableId <UUID>]
```

### Get a cryptoAuthModule by id

```bash
csdk crypto-auth-module get --id <value>
```
