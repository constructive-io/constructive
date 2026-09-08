# appInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppInternalSecret records via csdk CLI

## Usage

```bash
csdk app-internal-secret list
csdk app-internal-secret list --where.<field>.<op> <value> --orderBy <values>
csdk app-internal-secret list --limit 10 --after <cursor>
csdk app-internal-secret find-first --where.<field>.<op> <value>
csdk app-internal-secret get --id <UUID>
csdk app-internal-secret create --annotations <JSON> --description <String> --labels <JSON> --name <String> --realm <String> --retiredAt <Datetime> --rotatedAt <Datetime>
csdk app-internal-secret update --id <UUID> [--annotations <JSON>] [--description <String>] [--labels <JSON>] [--name <String>] [--realm <String>] [--retiredAt <Datetime>] [--rotatedAt <Datetime>]
csdk app-internal-secret delete --id <UUID>
```

## Examples

### List appInternalSecret records

```bash
csdk app-internal-secret list
```

### List appInternalSecret records with pagination

```bash
csdk app-internal-secret list --limit 10 --offset 0
```

### List appInternalSecret records with cursor pagination

```bash
csdk app-internal-secret list --limit 10 --after <cursor>
```

### Find first matching appInternalSecret

```bash
csdk app-internal-secret find-first --where.id.equalTo <value>
```

### List appInternalSecret records with field selection

```bash
csdk app-internal-secret list --select id,id
```

### List appInternalSecret records with filtering and ordering

```bash
csdk app-internal-secret list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appInternalSecret

```bash
csdk app-internal-secret create --annotations <JSON> --description <String> --labels <JSON> --name <String> --realm <String> --retiredAt <Datetime> --rotatedAt <Datetime>
```

### Get a appInternalSecret by id

```bash
csdk app-internal-secret get --id <value>
```
