# enum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Enum records via csdk CLI

## Usage

```bash
csdk enum list
csdk enum get --id <UUID>
csdk enum create --databaseId <UUID> --schemaId <UUID> --name <String> [--label <String>] [--description <String>] [--values <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk enum update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--name <String>] [--label <String>] [--description <String>] [--values <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk enum delete --id <UUID>
```

## Examples

### List all enum records

```bash
csdk enum list
```

### Create a enum

```bash
csdk enum create --databaseId <UUID> --schemaId <UUID> --name <String> [--label <String>] [--description <String>] [--values <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a enum by id

```bash
csdk enum get --id <value>
```
