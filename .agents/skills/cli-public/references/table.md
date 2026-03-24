# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Table records via csdk CLI

## Usage

```bash
csdk table list
csdk table get --id <UUID>
csdk table create --schemaId <UUID> --name <String> [--databaseId <UUID>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--useRls <Boolean>] [--timestamps <Boolean>] [--peoplestamps <Boolean>] [--pluralName <String>] [--singularName <String>] [--tags <String>] [--inheritsId <UUID>]
csdk table update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--name <String>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--useRls <Boolean>] [--timestamps <Boolean>] [--peoplestamps <Boolean>] [--pluralName <String>] [--singularName <String>] [--tags <String>] [--inheritsId <UUID>]
csdk table delete --id <UUID>
```

## Examples

### List all table records

```bash
csdk table list
```

### Create a table

```bash
csdk table create --schemaId <UUID> --name <String> [--databaseId <UUID>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--useRls <Boolean>] [--timestamps <Boolean>] [--peoplestamps <Boolean>] [--pluralName <String>] [--singularName <String>] [--tags <String>] [--inheritsId <UUID>]
```

### Get a table by id

```bash
csdk table get --id <value>
```
