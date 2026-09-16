# internalConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InternalConfig records via csdk CLI

## Usage

```bash
csdk internal-config list
csdk internal-config list --where.<field>.<op> <value> --orderBy <values>
csdk internal-config list --limit 10 --after <cursor>
csdk internal-config find-first --where.<field>.<op> <value>
csdk internal-config get --id <UUID>
csdk internal-config create --databaseId <UUID> --name <String> [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--provider <String>] [--realm <String>] [--value <String>]
csdk internal-config update --id <UUID> [--annotations <JSON>] [--databaseId <UUID>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--name <String>] [--provider <String>] [--realm <String>] [--value <String>]
csdk internal-config delete --id <UUID>
```

## Examples

### List internalConfig records

```bash
csdk internal-config list
```

### List internalConfig records with pagination

```bash
csdk internal-config list --limit 10 --offset 0
```

### List internalConfig records with cursor pagination

```bash
csdk internal-config list --limit 10 --after <cursor>
```

### Find first matching internalConfig

```bash
csdk internal-config find-first --where.id.equalTo <value>
```

### List internalConfig records with field selection

```bash
csdk internal-config list --select id,id
```

### List internalConfig records with filtering and ordering

```bash
csdk internal-config list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a internalConfig

```bash
csdk internal-config create --databaseId <UUID> --name <String> [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--provider <String>] [--realm <String>] [--value <String>]
```

### Get a internalConfig by id

```bash
csdk internal-config get --id <value>
```
