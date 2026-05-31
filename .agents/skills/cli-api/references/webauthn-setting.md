# webauthnSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for WebauthnSetting records via csdk CLI

## Usage

```bash
csdk webauthn-setting list
csdk webauthn-setting list --where.<field>.<op> <value> --orderBy <values>
csdk webauthn-setting list --limit 10 --after <cursor>
csdk webauthn-setting find-first --where.<field>.<op> <value>
csdk webauthn-setting get --id <UUID>
csdk webauthn-setting create --databaseId <UUID> [--schemaId <UUID>] [--credentialsSchemaId <UUID>] [--sessionsSchemaId <UUID>] [--sessionSecretsSchemaId <UUID>] [--credentialsTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--userFieldId <UUID>] [--rpId <String>] [--rpName <String>] [--originAllowlist <String>] [--attestationType <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--challengeExpirySeconds <BigInt>]
csdk webauthn-setting update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--credentialsSchemaId <UUID>] [--sessionsSchemaId <UUID>] [--sessionSecretsSchemaId <UUID>] [--credentialsTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--userFieldId <UUID>] [--rpId <String>] [--rpName <String>] [--originAllowlist <String>] [--attestationType <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--challengeExpirySeconds <BigInt>]
csdk webauthn-setting delete --id <UUID>
```

## Examples

### List webauthnSetting records

```bash
csdk webauthn-setting list
```

### List webauthnSetting records with pagination

```bash
csdk webauthn-setting list --limit 10 --offset 0
```

### List webauthnSetting records with cursor pagination

```bash
csdk webauthn-setting list --limit 10 --after <cursor>
```

### Find first matching webauthnSetting

```bash
csdk webauthn-setting find-first --where.id.equalTo <value>
```

### List webauthnSetting records with field selection

```bash
csdk webauthn-setting list --select id,id
```

### List webauthnSetting records with filtering and ordering

```bash
csdk webauthn-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a webauthnSetting

```bash
csdk webauthn-setting create --databaseId <UUID> [--schemaId <UUID>] [--credentialsSchemaId <UUID>] [--sessionsSchemaId <UUID>] [--sessionSecretsSchemaId <UUID>] [--credentialsTableId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsTableId <UUID>] [--userFieldId <UUID>] [--rpId <String>] [--rpName <String>] [--originAllowlist <String>] [--attestationType <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--challengeExpirySeconds <BigInt>]
```

### Get a webauthnSetting by id

```bash
csdk webauthn-setting get --id <value>
```
