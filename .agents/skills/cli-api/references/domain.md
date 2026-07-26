# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Domain records via csdk CLI

## Usage

```bash
csdk domain list
csdk domain list --where.<field>.<op> <value> --orderBy <values>
csdk domain list --limit 10 --after <cursor>
csdk domain find-first --where.<field>.<op> <value>
csdk domain get --id <UUID>
csdk domain create --databaseId <UUID> --hostname <String> [--config <JSON>] [--isPublished <Boolean>] [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsReadyAt <Datetime>] [--tlsSecretName <String>] [--tlsStatus <String>] [--verificationStatus <String>] [--verifiedAt <Datetime>]
csdk domain update --id <UUID> [--config <JSON>] [--databaseId <UUID>] [--hostname <String>] [--isPublished <Boolean>] [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsReadyAt <Datetime>] [--tlsSecretName <String>] [--tlsStatus <String>] [--verificationStatus <String>] [--verifiedAt <Datetime>]
csdk domain delete --id <UUID>
```

## Examples

### List domain records

```bash
csdk domain list
```

### List domain records with pagination

```bash
csdk domain list --limit 10 --offset 0
```

### List domain records with cursor pagination

```bash
csdk domain list --limit 10 --after <cursor>
```

### Find first matching domain

```bash
csdk domain find-first --where.id.equalTo <value>
```

### List domain records with field selection

```bash
csdk domain list --select id,id
```

### List domain records with filtering and ordering

```bash
csdk domain list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a domain

```bash
csdk domain create --databaseId <UUID> --hostname <String> [--config <JSON>] [--isPublished <Boolean>] [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsReadyAt <Datetime>] [--tlsSecretName <String>] [--tlsStatus <String>] [--verificationStatus <String>] [--verifiedAt <Datetime>]
```

### Get a domain by id

```bash
csdk domain get --id <value>
```
