# defaultPrivilege

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DefaultPrivilege records via csdk CLI

## Usage

```bash
csdk default-privilege list
csdk default-privilege get --id <UUID>
csdk default-privilege create --schemaId <UUID> --objectType <String> --privilege <String> --granteeName <String> [--databaseId <UUID>] [--isGrant <Boolean>]
csdk default-privilege update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--objectType <String>] [--privilege <String>] [--granteeName <String>] [--isGrant <Boolean>]
csdk default-privilege delete --id <UUID>
```

## Examples

### List all defaultPrivilege records

```bash
csdk default-privilege list
```

### Create a defaultPrivilege

```bash
csdk default-privilege create --schemaId <UUID> --objectType <String> --privilege <String> --granteeName <String> [--databaseId <UUID>] [--isGrant <Boolean>]
```

### Get a defaultPrivilege by id

```bash
csdk default-privilege get --id <value>
```
