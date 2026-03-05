# database

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Database records via csdk CLI

## Usage

```bash
csdk database list
csdk database get --id <value>
csdk database create --ownerId <value> --schemaHash <value> --name <value> --label <value> --hash <value>
csdk database update --id <value> [--ownerId <value>] [--schemaHash <value>] [--name <value>] [--label <value>] [--hash <value>]
csdk database delete --id <value>
```

## Examples

### List all database records

```bash
csdk database list
```

### Create a database

```bash
csdk database create --ownerId "value" --schemaHash "value" --name "value" --label "value" --hash "value"
```

### Get a database by id

```bash
csdk database get --id <value>
```
