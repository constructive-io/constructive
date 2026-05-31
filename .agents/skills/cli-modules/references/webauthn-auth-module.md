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
csdk webauthn-auth-module create --databaseId <UUID> [--schemaId <UUID>] [--usersTableId <UUID>] [--credentialsTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--authSettingsTableId <UUID>] [--rpId <String>] [--rpName <String>] [--originAllowlist <String>] [--attestationType <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--challengeExpiry <Interval>]
csdk webauthn-auth-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--usersTableId <UUID>] [--credentialsTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--authSettingsTableId <UUID>] [--rpId <String>] [--rpName <String>] [--originAllowlist <String>] [--attestationType <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--challengeExpiry <Interval>]
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
csdk webauthn-auth-module create --databaseId <UUID> [--schemaId <UUID>] [--usersTableId <UUID>] [--credentialsTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--authSettingsTableId <UUID>] [--rpId <String>] [--rpName <String>] [--originAllowlist <String>] [--attestationType <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--challengeExpiry <Interval>]
```

### Get a webauthnAuthModule by id

```bash
csdk webauthn-auth-module get --id <value>
```
