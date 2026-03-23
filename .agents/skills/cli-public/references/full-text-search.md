# fullTextSearch

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FullTextSearch records via csdk CLI

## Usage

```bash
csdk full-text-search list
csdk full-text-search get --id <UUID>
csdk full-text-search create --tableId <UUID> --fieldId <UUID> --fieldIds <UUID> --weights <String> --langs <String> [--databaseId <UUID>]
csdk full-text-search update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--fieldId <UUID>] [--fieldIds <UUID>] [--weights <String>] [--langs <String>]
csdk full-text-search delete --id <UUID>
```

## Examples

### List all fullTextSearch records

```bash
csdk full-text-search list
```

### Create a fullTextSearch

```bash
csdk full-text-search create --tableId <UUID> --fieldId <UUID> --fieldIds <UUID> --weights <String> --langs <String> [--databaseId <UUID>]
```

### Get a fullTextSearch by id

```bash
csdk full-text-search get --id <value>
```
