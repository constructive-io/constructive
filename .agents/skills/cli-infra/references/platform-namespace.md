# platformNamespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformNamespace records via csdk CLI

## Usage

```bash
csdk platform-namespace list
csdk platform-namespace list --where.<field>.<op> <value> --orderBy <values>
csdk platform-namespace list --limit 10 --after <cursor>
csdk platform-namespace find-first --where.<field>.<op> <value>
csdk platform-namespace get --id <UUID>
csdk platform-namespace create --name <String> --namespaceName <String> [--annotations <JSON>] [--description <String>] [--isActive <Boolean>] [--isManaged <Boolean>] [--labels <JSON>] [--lastError <String>] [--status <String>]
csdk platform-namespace update --id <UUID> [--annotations <JSON>] [--description <String>] [--isActive <Boolean>] [--isManaged <Boolean>] [--labels <JSON>] [--lastError <String>] [--name <String>] [--namespaceName <String>] [--status <String>]
csdk platform-namespace delete --id <UUID>
```

## Examples

### List platformNamespace records

```bash
csdk platform-namespace list
```

### List platformNamespace records with pagination

```bash
csdk platform-namespace list --limit 10 --offset 0
```

### List platformNamespace records with cursor pagination

```bash
csdk platform-namespace list --limit 10 --after <cursor>
```

### Find first matching platformNamespace

```bash
csdk platform-namespace find-first --where.id.equalTo <value>
```

### List platformNamespace records with field selection

```bash
csdk platform-namespace list --select id,id
```

### List platformNamespace records with filtering and ordering

```bash
csdk platform-namespace list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformNamespace

```bash
csdk platform-namespace create --name <String> --namespaceName <String> [--annotations <JSON>] [--description <String>] [--isActive <Boolean>] [--isManaged <Boolean>] [--labels <JSON>] [--lastError <String>] [--status <String>]
```

### Get a platformNamespace by id

```bash
csdk platform-namespace get --id <value>
```
