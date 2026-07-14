# platformInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformInternalSecret records via csdk CLI

## Usage

```bash
csdk platform-internal-secret list
csdk platform-internal-secret list --where.<field>.<op> <value> --orderBy <values>
csdk platform-internal-secret list --limit 10 --after <cursor>
csdk platform-internal-secret find-first --where.<field>.<op> <value>
csdk platform-internal-secret get --id <UUID>
csdk platform-internal-secret create [--annotations <JSON>] [--description <String>] [--labels <JSON>] [--name <String>] [--namespaceId <UUID>] [--retiredAt <Datetime>] [--rotatedAt <Datetime>]
csdk platform-internal-secret update --id <UUID> [--annotations <JSON>] [--description <String>] [--labels <JSON>] [--name <String>] [--namespaceId <UUID>] [--retiredAt <Datetime>] [--rotatedAt <Datetime>]
csdk platform-internal-secret delete --id <UUID>
```

## Examples

### List platformInternalSecret records

```bash
csdk platform-internal-secret list
```

### List platformInternalSecret records with pagination

```bash
csdk platform-internal-secret list --limit 10 --offset 0
```

### List platformInternalSecret records with cursor pagination

```bash
csdk platform-internal-secret list --limit 10 --after <cursor>
```

### Find first matching platformInternalSecret

```bash
csdk platform-internal-secret find-first --where.id.equalTo <value>
```

### List platformInternalSecret records with field selection

```bash
csdk platform-internal-secret list --select id,id
```

### List platformInternalSecret records with filtering and ordering

```bash
csdk platform-internal-secret list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformInternalSecret

```bash
csdk platform-internal-secret create [--annotations <JSON>] [--description <String>] [--labels <JSON>] [--name <String>] [--namespaceId <UUID>] [--retiredAt <Datetime>] [--rotatedAt <Datetime>]
```

### Get a platformInternalSecret by id

```bash
csdk platform-internal-secret get --id <value>
```
