# namespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Namespace records via csdk CLI

## Usage

```bash
csdk namespace list
csdk namespace list --where.<field>.<op> <value> --orderBy <values>
csdk namespace list --limit 10 --after <cursor>
csdk namespace find-first --where.<field>.<op> <value>
csdk namespace get --id <UUID>
csdk namespace create --name <String> --namespaceName <String> --databaseId <UUID> [--description <String>] [--isActive <Boolean>] [--status <String>] [--lastError <String>] [--labels <JSON>] [--annotations <JSON>] [--isManaged <Boolean>]
csdk namespace update --id <UUID> [--name <String>] [--namespaceName <String>] [--description <String>] [--isActive <Boolean>] [--status <String>] [--lastError <String>] [--labels <JSON>] [--annotations <JSON>] [--databaseId <UUID>] [--isManaged <Boolean>]
csdk namespace delete --id <UUID>
```

## Examples

### List namespace records

```bash
csdk namespace list
```

### List namespace records with pagination

```bash
csdk namespace list --limit 10 --offset 0
```

### List namespace records with cursor pagination

```bash
csdk namespace list --limit 10 --after <cursor>
```

### Find first matching namespace

```bash
csdk namespace find-first --where.id.equalTo <value>
```

### List namespace records with field selection

```bash
csdk namespace list --select id,id
```

### List namespace records with filtering and ordering

```bash
csdk namespace list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a namespace

```bash
csdk namespace create --name <String> --namespaceName <String> --databaseId <UUID> [--description <String>] [--isActive <Boolean>] [--status <String>] [--lastError <String>] [--labels <JSON>] [--annotations <JSON>] [--isManaged <Boolean>]
```

### Get a namespace by id

```bash
csdk namespace get --id <value>
```
