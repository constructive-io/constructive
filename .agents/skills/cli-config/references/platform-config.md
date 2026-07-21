# platformConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformConfig records via csdk CLI

## Usage

```bash
csdk platform-config list
csdk platform-config list --where.<field>.<op> <value> --orderBy <values>
csdk platform-config list --limit 10 --after <cursor>
csdk platform-config find-first --where.<field>.<op> <value>
csdk platform-config get --id <UUID>
csdk platform-config create --name <String> --namespaceId <UUID> [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--provider <String>] [--value <String>]
csdk platform-config update --id <UUID> [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--name <String>] [--namespaceId <UUID>] [--provider <String>] [--value <String>]
csdk platform-config delete --id <UUID>
```

## Examples

### List platformConfig records

```bash
csdk platform-config list
```

### List platformConfig records with pagination

```bash
csdk platform-config list --limit 10 --offset 0
```

### List platformConfig records with cursor pagination

```bash
csdk platform-config list --limit 10 --after <cursor>
```

### Find first matching platformConfig

```bash
csdk platform-config find-first --where.id.equalTo <value>
```

### List platformConfig records with field selection

```bash
csdk platform-config list --select id,id
```

### List platformConfig records with filtering and ordering

```bash
csdk platform-config list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformConfig

```bash
csdk platform-config create --name <String> --namespaceId <UUID> [--annotations <JSON>] [--description <String>] [--expiresAt <Datetime>] [--labels <JSON>] [--provider <String>] [--value <String>]
```

### Get a platformConfig by id

```bash
csdk platform-config get --id <value>
```
