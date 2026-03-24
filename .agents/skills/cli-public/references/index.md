# index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Index records via csdk CLI

## Usage

```bash
csdk index list
csdk index get --id <UUID>
csdk index create --databaseId <UUID> --tableId <UUID> [--name <String>] [--fieldIds <UUID>] [--includeFieldIds <UUID>] [--accessMethod <String>] [--indexParams <JSON>] [--whereClause <JSON>] [--isUnique <Boolean>] [--options <JSON>] [--opClasses <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk index update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--fieldIds <UUID>] [--includeFieldIds <UUID>] [--accessMethod <String>] [--indexParams <JSON>] [--whereClause <JSON>] [--isUnique <Boolean>] [--options <JSON>] [--opClasses <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk index delete --id <UUID>
```

## Examples

### List all index records

```bash
csdk index list
```

### Create a index

```bash
csdk index create --databaseId <UUID> --tableId <UUID> [--name <String>] [--fieldIds <UUID>] [--includeFieldIds <UUID>] [--accessMethod <String>] [--indexParams <JSON>] [--whereClause <JSON>] [--isUnique <Boolean>] [--options <JSON>] [--opClasses <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a index by id

```bash
csdk index get --id <value>
```
