# configSecretsOrgModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ConfigSecretsOrgModule records via csdk CLI

## Usage

```bash
csdk config-secrets-org-module list
csdk config-secrets-org-module list --where.<field>.<op> <value> --orderBy <values>
csdk config-secrets-org-module list --limit 10 --after <cursor>
csdk config-secrets-org-module find-first --where.<field>.<op> <value>
csdk config-secrets-org-module get --id <UUID>
csdk config-secrets-org-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk config-secrets-org-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk config-secrets-org-module delete --id <UUID>
```

## Examples

### List configSecretsOrgModule records

```bash
csdk config-secrets-org-module list
```

### List configSecretsOrgModule records with pagination

```bash
csdk config-secrets-org-module list --limit 10 --offset 0
```

### List configSecretsOrgModule records with cursor pagination

```bash
csdk config-secrets-org-module list --limit 10 --after <cursor>
```

### Find first matching configSecretsOrgModule

```bash
csdk config-secrets-org-module find-first --where.id.equalTo <value>
```

### List configSecretsOrgModule records with field selection

```bash
csdk config-secrets-org-module list --select id,id
```

### List configSecretsOrgModule records with filtering and ordering

```bash
csdk config-secrets-org-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a configSecretsOrgModule

```bash
csdk config-secrets-org-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a configSecretsOrgModule by id

```bash
csdk config-secrets-org-module get --id <value>
```
