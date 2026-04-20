# userConnectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserConnectedAccount records via csdk CLI

## Usage

```bash
csdk user-connected-account list
csdk user-connected-account list --where.<field>.<op> <value> --orderBy <values>
csdk user-connected-account list --limit 10 --after <cursor>
csdk user-connected-account find-first --where.<field>.<op> <value>
csdk user-connected-account get --id <UUID>
csdk user-connected-account create [--ownerId <UUID>] [--service <String>] [--identifier <String>] [--details <JSON>] [--isVerified <Boolean>]
csdk user-connected-account update --id <UUID> [--ownerId <UUID>] [--service <String>] [--identifier <String>] [--details <JSON>] [--isVerified <Boolean>]
csdk user-connected-account delete --id <UUID>
```

## Examples

### List userConnectedAccount records

```bash
csdk user-connected-account list
```

### List userConnectedAccount records with pagination

```bash
csdk user-connected-account list --limit 10 --offset 0
```

### List userConnectedAccount records with cursor pagination

```bash
csdk user-connected-account list --limit 10 --after <cursor>
```

### Find first matching userConnectedAccount

```bash
csdk user-connected-account find-first --where.id.equalTo <value>
```

### List userConnectedAccount records with field selection

```bash
csdk user-connected-account list --select id,id
```

### List userConnectedAccount records with filtering and ordering

```bash
csdk user-connected-account list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a userConnectedAccount

```bash
csdk user-connected-account create [--ownerId <UUID>] [--service <String>] [--identifier <String>] [--details <JSON>] [--isVerified <Boolean>]
```

### Get a userConnectedAccount by id

```bash
csdk user-connected-account get --id <value>
```
