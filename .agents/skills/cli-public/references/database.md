# database

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Database records via csdk CLI

## Usage

```bash
csdk database list
csdk database get --id <UUID>
csdk database create [--ownerId <UUID>] [--schemaHash <String>] [--name <String>] [--label <String>] [--hash <UUID>]
csdk database update --id <UUID> [--ownerId <UUID>] [--schemaHash <String>] [--name <String>] [--label <String>] [--hash <UUID>]
csdk database delete --id <UUID>
```

## Examples

### List all database records

```bash
csdk database list
```

### Create a database

```bash
csdk database create [--ownerId <UUID>] [--schemaHash <String>] [--name <String>] [--label <String>] [--hash <UUID>]
```

### Get a database by id

```bash
csdk database get --id <value>
```
