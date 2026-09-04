# platformInternalConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformInternalConfig records via csdk CLI

## Usage

```bash
csdk platform-internal-config list
csdk platform-internal-config list --where.<field>.<op> <value> --orderBy <values>
csdk platform-internal-config list --limit 10 --after <cursor>
csdk platform-internal-config find-first --where.<field>.<op> <value>
csdk platform-internal-config get --id <UUID>
csdk platform-internal-config create --name <String> [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--provider <String>] [--realm <String>] [--value <String>]
csdk platform-internal-config update --id <UUID> [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--name <String>] [--provider <String>] [--realm <String>] [--value <String>]
csdk platform-internal-config delete --id <UUID>
```

## Examples

### List platformInternalConfig records

```bash
csdk platform-internal-config list
```

### List platformInternalConfig records with pagination

```bash
csdk platform-internal-config list --limit 10 --offset 0
```

### List platformInternalConfig records with cursor pagination

```bash
csdk platform-internal-config list --limit 10 --after <cursor>
```

### Find first matching platformInternalConfig

```bash
csdk platform-internal-config find-first --where.id.equalTo <value>
```

### List platformInternalConfig records with field selection

```bash
csdk platform-internal-config list --select id,id
```

### List platformInternalConfig records with filtering and ordering

```bash
csdk platform-internal-config list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformInternalConfig

```bash
csdk platform-internal-config create --name <String> [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--provider <String>] [--realm <String>] [--value <String>]
```

### Get a platformInternalConfig by id

```bash
csdk platform-internal-config get --id <value>
```
