# config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Config records via csdk CLI

## Usage

```bash
csdk config list
csdk config list --where.<field>.<op> <value> --orderBy <values>
csdk config list --limit 10 --after <cursor>
csdk config find-first --where.<field>.<op> <value>
csdk config get --id <UUID>
csdk config create --namespaceId <UUID> --databaseId <UUID> --name <String> [--provider <String>] [--value <String>] [--labels <JSON>] [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>]
csdk config update --id <UUID> [--namespaceId <UUID>] [--databaseId <UUID>] [--name <String>] [--provider <String>] [--value <String>] [--labels <JSON>] [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>]
csdk config delete --id <UUID>
```

## Examples

### List config records

```bash
csdk config list
```

### List config records with pagination

```bash
csdk config list --limit 10 --offset 0
```

### List config records with cursor pagination

```bash
csdk config list --limit 10 --after <cursor>
```

### Find first matching config

```bash
csdk config find-first --where.id.equalTo <value>
```

### List config records with field selection

```bash
csdk config list --select id,id
```

### List config records with filtering and ordering

```bash
csdk config list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a config

```bash
csdk config create --namespaceId <UUID> --databaseId <UUID> --name <String> [--provider <String>] [--value <String>] [--labels <JSON>] [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>]
```

### Get a config by id

```bash
csdk config get --id <value>
```
