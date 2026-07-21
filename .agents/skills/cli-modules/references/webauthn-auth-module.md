# webauthnAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for WebauthnAuthModule records via csdk CLI

## Usage

```bash
csdk webauthn-auth-module list
csdk webauthn-auth-module list --where.<field>.<op> <value> --orderBy <values>
csdk webauthn-auth-module list --limit 10 --after <cursor>
csdk webauthn-auth-module find-first --where.<field>.<op> <value>
csdk webauthn-auth-module get --id <UUID>
csdk webauthn-auth-module create --databaseId <UUID> [--attestationType <String>] [--authSettingsTableId <UUID>] [--challengeExpiry <Interval>] [--credentialsTableId <UUID>] [--originAllowlist <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--rpId <String>] [--rpName <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>]
csdk webauthn-auth-module update --id <UUID> [--attestationType <String>] [--authSettingsTableId <UUID>] [--challengeExpiry <Interval>] [--credentialsTableId <UUID>] [--databaseId <UUID>] [--originAllowlist <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--rpId <String>] [--rpName <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>]
csdk webauthn-auth-module delete --id <UUID>
```

## Examples

### List webauthnAuthModule records

```bash
csdk webauthn-auth-module list
```

### List webauthnAuthModule records with pagination

```bash
csdk webauthn-auth-module list --limit 10 --offset 0
```

### List webauthnAuthModule records with cursor pagination

```bash
csdk webauthn-auth-module list --limit 10 --after <cursor>
```

### Find first matching webauthnAuthModule

```bash
csdk webauthn-auth-module find-first --where.id.equalTo <value>
```

### List webauthnAuthModule records with field selection

```bash
csdk webauthn-auth-module list --select id,id
```

### List webauthnAuthModule records with filtering and ordering

```bash
csdk webauthn-auth-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a webauthnAuthModule

```bash
csdk webauthn-auth-module create --databaseId <UUID> [--attestationType <String>] [--authSettingsTableId <UUID>] [--challengeExpiry <Interval>] [--credentialsTableId <UUID>] [--originAllowlist <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--rpId <String>] [--rpName <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>]
```

### Get a webauthnAuthModule by id

```bash
csdk webauthn-auth-module get --id <value>
```
