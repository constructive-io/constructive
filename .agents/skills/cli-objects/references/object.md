# object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Object records via csdk CLI

## Usage

```bash
csdk object list
csdk object list --where.<field>.<op> <value> --orderBy <values>
csdk object list --limit 10 --after <cursor>
csdk object find-first --where.<field>.<op> <value>
csdk object get --id <UUID>
csdk object create --databaseId <UUID> [--kids <UUID>] [--ktree <String>] [--data <JSON>] [--frzn <Boolean>]
csdk object update --id <UUID> [--databaseId <UUID>] [--kids <UUID>] [--ktree <String>] [--data <JSON>] [--frzn <Boolean>]
csdk object delete --id <UUID>
```

## Examples

### List object records

```bash
csdk object list
```

### List object records with pagination

```bash
csdk object list --limit 10 --offset 0
```

### List object records with cursor pagination

```bash
csdk object list --limit 10 --after <cursor>
```

### Find first matching object

```bash
csdk object find-first --where.id.equalTo <value>
```

### List object records with field selection

```bash
csdk object list --select id,id
```

### List object records with filtering and ordering

```bash
csdk object list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a object

```bash
csdk object create --databaseId <UUID> [--kids <UUID>] [--ktree <String>] [--data <JSON>] [--frzn <Boolean>]
```

### Get a object by id

```bash
csdk object get --id <value>
```
