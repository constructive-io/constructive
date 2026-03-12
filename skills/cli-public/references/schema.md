# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Schema records via csdk CLI

## Usage

```bash
csdk schema list
csdk schema get --id <value>
csdk schema create --databaseId <value> --name <value> --schemaName <value> [--label <value>] [--description <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>] [--isPublic <value>]
csdk schema update --id <value> [--databaseId <value>] [--name <value>] [--schemaName <value>] [--label <value>] [--description <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>] [--isPublic <value>]
csdk schema delete --id <value>
```

## Examples

### List all schema records

```bash
csdk schema list
```

### Create a schema

```bash
csdk schema create --databaseId <value> --name <value> --schemaName <value> [--label <value>] [--description <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>] [--isPublic <value>]
```

### Get a schema by id

```bash
csdk schema get --id <value>
```
