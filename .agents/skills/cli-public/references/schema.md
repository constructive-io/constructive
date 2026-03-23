# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Schema records via csdk CLI

## Usage

```bash
csdk schema list
csdk schema get --id <UUID>
csdk schema create --databaseId <UUID> --name <String> --schemaName <String> [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>] [--isPublic <Boolean>]
csdk schema update --id <UUID> [--databaseId <UUID>] [--name <String>] [--schemaName <String>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>] [--isPublic <Boolean>]
csdk schema delete --id <UUID>
```

## Examples

### List all schema records

```bash
csdk schema list
```

### Create a schema

```bash
csdk schema create --databaseId <UUID> --name <String> --schemaName <String> [--label <String>] [--description <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>] [--isPublic <Boolean>]
```

### Get a schema by id

```bash
csdk schema get --id <value>
```
