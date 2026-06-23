# platformConfigDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformConfigDefinition records via csdk CLI

## Usage

```bash
csdk platform-config-definition list
csdk platform-config-definition list --where.<field>.<op> <value> --orderBy <values>
csdk platform-config-definition list --limit 10 --after <cursor>
csdk platform-config-definition find-first --where.<field>.<op> <value>
csdk platform-config-definition get --id <UUID>
csdk platform-config-definition create --name <String> [--description <String>] [--defaultValue <String>] [--isBuiltIn <Boolean>] [--labels <JSON>] [--annotations <JSON>]
csdk platform-config-definition update --id <UUID> [--name <String>] [--description <String>] [--defaultValue <String>] [--isBuiltIn <Boolean>] [--labels <JSON>] [--annotations <JSON>]
csdk platform-config-definition delete --id <UUID>
```

## Examples

### List platformConfigDefinition records

```bash
csdk platform-config-definition list
```

### List platformConfigDefinition records with pagination

```bash
csdk platform-config-definition list --limit 10 --offset 0
```

### List platformConfigDefinition records with cursor pagination

```bash
csdk platform-config-definition list --limit 10 --after <cursor>
```

### Find first matching platformConfigDefinition

```bash
csdk platform-config-definition find-first --where.id.equalTo <value>
```

### List platformConfigDefinition records with field selection

```bash
csdk platform-config-definition list --select id,id
```

### List platformConfigDefinition records with filtering and ordering

```bash
csdk platform-config-definition list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformConfigDefinition

```bash
csdk platform-config-definition create --name <String> [--description <String>] [--defaultValue <String>] [--isBuiltIn <Boolean>] [--labels <JSON>] [--annotations <JSON>]
```

### Get a platformConfigDefinition by id

```bash
csdk platform-config-definition get --id <value>
```
