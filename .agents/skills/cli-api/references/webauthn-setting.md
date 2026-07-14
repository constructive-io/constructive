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
csdk webauthn-setting create --databaseId <UUID> [--attestationType <String>] [--challengeExpirySeconds <BigInt>] [--credentialsSchemaId <UUID>] [--credentialsTableId <UUID>] [--originAllowlist <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--rpId <String>] [--rpName <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsSchemaId <UUID>] [--sessionSecretsTableId <UUID>] [--sessionsSchemaId <UUID>] [--sessionsTableId <UUID>] [--userFieldId <UUID>]
csdk webauthn-setting update --id <UUID> [--attestationType <String>] [--challengeExpirySeconds <BigInt>] [--credentialsSchemaId <UUID>] [--credentialsTableId <UUID>] [--databaseId <UUID>] [--originAllowlist <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--rpId <String>] [--rpName <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsSchemaId <UUID>] [--sessionSecretsTableId <UUID>] [--sessionsSchemaId <UUID>] [--sessionsTableId <UUID>] [--userFieldId <UUID>]
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
csdk webauthn-setting create --databaseId <UUID> [--attestationType <String>] [--challengeExpirySeconds <BigInt>] [--credentialsSchemaId <UUID>] [--credentialsTableId <UUID>] [--originAllowlist <String>] [--requireUserVerification <Boolean>] [--residentKey <String>] [--rpId <String>] [--rpName <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionSecretsSchemaId <UUID>] [--sessionSecretsTableId <UUID>] [--sessionsSchemaId <UUID>] [--sessionsTableId <UUID>] [--userFieldId <UUID>]
```

### Get a webauthnSetting by id

```bash
csdk webauthn-setting get --id <value>
```
