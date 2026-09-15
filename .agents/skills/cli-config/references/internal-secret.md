# internalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InternalSecret records via csdk CLI

## Usage

```bash
csdk internal-secret list
csdk internal-secret list --where.<field>.<op> <value> --orderBy <values>
csdk internal-secret list --limit 10 --after <cursor>
csdk internal-secret find-first --where.<field>.<op> <value>
csdk internal-secret get --id <UUID>
csdk internal-secret create --annotations <JSON> --databaseId <UUID> --description <String> --labels <JSON> --name <String> --realm <String> --retiredAt <Datetime> --rotatedAt <Datetime>
csdk internal-secret update --id <UUID> [--annotations <JSON>] [--databaseId <UUID>] [--description <String>] [--labels <JSON>] [--name <String>] [--realm <String>] [--retiredAt <Datetime>] [--rotatedAt <Datetime>]
csdk internal-secret delete --id <UUID>
```

## Examples

### List internalSecret records

```bash
csdk internal-secret list
```

### List internalSecret records with pagination

```bash
csdk internal-secret list --limit 10 --offset 0
```

### List internalSecret records with cursor pagination

```bash
csdk internal-secret list --limit 10 --after <cursor>
```

### Find first matching internalSecret

```bash
csdk internal-secret find-first --where.id.equalTo <value>
```

### List internalSecret records with field selection

```bash
csdk internal-secret list --select id,id
```

### List internalSecret records with filtering and ordering

```bash
csdk internal-secret list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a internalSecret

```bash
csdk internal-secret create --annotations <JSON> --databaseId <UUID> --description <String> --labels <JSON> --name <String> --realm <String> --retiredAt <Datetime> --rotatedAt <Datetime>
```

### Get a internalSecret by id

```bash
csdk internal-secret get --id <value>
```
