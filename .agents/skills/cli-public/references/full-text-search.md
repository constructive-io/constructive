# fullTextSearch

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FullTextSearch records via csdk CLI

## Usage

```bash
csdk full-text-search list
csdk full-text-search list --where.<field>.<op> <value> --orderBy <values>
csdk full-text-search list --limit 10 --after <cursor>
csdk full-text-search find-first --where.<field>.<op> <value>
csdk full-text-search get --id <UUID>
csdk full-text-search create --tableId <UUID> --fieldId <UUID> --fieldIds <UUID> --weights <String> --langs <String> [--databaseId <UUID>]
csdk full-text-search update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--fieldId <UUID>] [--fieldIds <UUID>] [--weights <String>] [--langs <String>]
csdk full-text-search delete --id <UUID>
```

## Examples

### List fullTextSearch records

```bash
csdk full-text-search list
```

### List fullTextSearch records with pagination

```bash
csdk full-text-search list --limit 10 --offset 0
```

### List fullTextSearch records with cursor pagination

```bash
csdk full-text-search list --limit 10 --after <cursor>
```

### Find first matching fullTextSearch

```bash
csdk full-text-search find-first --where.id.equalTo <value>
```

### List fullTextSearch records with field selection

```bash
csdk full-text-search list --select id,id
```

### List fullTextSearch records with filtering and ordering

```bash
csdk full-text-search list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a fullTextSearch

```bash
csdk full-text-search create --tableId <UUID> --fieldId <UUID> --fieldIds <UUID> --weights <String> --langs <String> [--databaseId <UUID>]
```

### Get a fullTextSearch by id

```bash
csdk full-text-search get --id <value>
```
