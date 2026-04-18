# webauthnCredentialsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for WebauthnCredentialsModule records via csdk CLI

## Usage

```bash
csdk webauthn-credentials-module list
csdk webauthn-credentials-module list --where.<field>.<op> <value> --orderBy <values>
csdk webauthn-credentials-module list --limit 10 --after <cursor>
csdk webauthn-credentials-module find-first --where.<field>.<op> <value>
csdk webauthn-credentials-module get --id <UUID>
csdk webauthn-credentials-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>]
csdk webauthn-credentials-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>]
csdk webauthn-credentials-module delete --id <UUID>
```

## Examples

### List webauthnCredentialsModule records

```bash
csdk webauthn-credentials-module list
```

### List webauthnCredentialsModule records with pagination

```bash
csdk webauthn-credentials-module list --limit 10 --offset 0
```

### List webauthnCredentialsModule records with cursor pagination

```bash
csdk webauthn-credentials-module list --limit 10 --after <cursor>
```

### Find first matching webauthnCredentialsModule

```bash
csdk webauthn-credentials-module find-first --where.id.equalTo <value>
```

### List webauthnCredentialsModule records with field selection

```bash
csdk webauthn-credentials-module list --select id,id
```

### List webauthnCredentialsModule records with filtering and ordering

```bash
csdk webauthn-credentials-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a webauthnCredentialsModule

```bash
csdk webauthn-credentials-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>]
```

### Get a webauthnCredentialsModule by id

```bash
csdk webauthn-credentials-module get --id <value>
```
