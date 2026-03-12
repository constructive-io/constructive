# fullTextSearch

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FullTextSearch records via csdk CLI

## Usage

```bash
csdk full-text-search list
csdk full-text-search get --id <value>
csdk full-text-search create --tableId <value> --fieldId <value> --fieldIds <value> --weights <value> --langs <value> [--databaseId <value>]
csdk full-text-search update --id <value> [--databaseId <value>] [--tableId <value>] [--fieldId <value>] [--fieldIds <value>] [--weights <value>] [--langs <value>]
csdk full-text-search delete --id <value>
```

## Examples

### List all fullTextSearch records

```bash
csdk full-text-search list
```

### Create a fullTextSearch

```bash
csdk full-text-search create --tableId <value> --fieldId <value> --fieldIds <value> --weights <value> --langs <value> [--databaseId <value>]
```

### Get a fullTextSearch by id

```bash
csdk full-text-search get --id <value>
```
