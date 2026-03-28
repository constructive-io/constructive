# connectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ConnectedAccount records via csdk CLI

## Usage

```bash
csdk connected-account list
csdk connected-account list --where.<field>.<op> <value> --orderBy <values>
csdk connected-account list --limit 10 --after <cursor>
csdk connected-account find-first --where.<field>.<op> <value>
csdk connected-account get --id <UUID>
csdk connected-account create --service <String> --identifier <String> --details <JSON> [--ownerId <UUID>] [--isVerified <Boolean>]
csdk connected-account update --id <UUID> [--ownerId <UUID>] [--service <String>] [--identifier <String>] [--details <JSON>] [--isVerified <Boolean>]
csdk connected-account delete --id <UUID>
```

## Examples

### List connectedAccount records

```bash
csdk connected-account list
```

### List connectedAccount records with pagination

```bash
csdk connected-account list --limit 10 --offset 0
```

### List connectedAccount records with cursor pagination

```bash
csdk connected-account list --limit 10 --after <cursor>
```

### Find first matching connectedAccount

```bash
csdk connected-account find-first --where.id.equalTo <value>
```

### List connectedAccount records with field selection

```bash
csdk connected-account list --select id,id
```

### List connectedAccount records with filtering and ordering

```bash
csdk connected-account list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a connectedAccount

```bash
csdk connected-account create --service <String> --identifier <String> --details <JSON> [--ownerId <UUID>] [--isVerified <Boolean>]
```

### Get a connectedAccount by id

```bash
csdk connected-account get --id <value>
```
