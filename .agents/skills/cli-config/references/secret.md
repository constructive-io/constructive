# secret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Secret records via csdk CLI

## Usage

```bash
csdk secret list
csdk secret list --where.<field>.<op> <value> --orderBy <values>
csdk secret list --limit 10 --after <cursor>
csdk secret find-first --where.<field>.<op> <value>
csdk secret get --id <UUID>
csdk secret create [--databaseId <UUID>] [--name <String>] [--provider <String>] [--namespaceId <UUID>] [--description <String>] [--labels <JSON>] [--annotations <JSON>] [--rotatedAt <Datetime>] [--retiredAt <Datetime>]
csdk secret update --id <UUID> [--databaseId <UUID>] [--name <String>] [--provider <String>] [--namespaceId <UUID>] [--description <String>] [--labels <JSON>] [--annotations <JSON>] [--rotatedAt <Datetime>] [--retiredAt <Datetime>]
csdk secret delete --id <UUID>
```

## Examples

### List secret records

```bash
csdk secret list
```

### List secret records with pagination

```bash
csdk secret list --limit 10 --offset 0
```

### List secret records with cursor pagination

```bash
csdk secret list --limit 10 --after <cursor>
```

### Find first matching secret

```bash
csdk secret find-first --where.id.equalTo <value>
```

### List secret records with field selection

```bash
csdk secret list --select id,id
```

### List secret records with filtering and ordering

```bash
csdk secret list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a secret

```bash
csdk secret create [--databaseId <UUID>] [--name <String>] [--provider <String>] [--namespaceId <UUID>] [--description <String>] [--labels <JSON>] [--annotations <JSON>] [--rotatedAt <Datetime>] [--retiredAt <Datetime>]
```

### Get a secret by id

```bash
csdk secret get --id <value>
```
