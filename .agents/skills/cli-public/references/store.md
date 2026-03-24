# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Store records via csdk CLI

## Usage

```bash
csdk store list
csdk store get --id <UUID>
csdk store create --name <String> --databaseId <UUID> [--hash <UUID>]
csdk store update --id <UUID> [--name <String>] [--databaseId <UUID>] [--hash <UUID>]
csdk store delete --id <UUID>
```

## Examples

### List all store records

```bash
csdk store list
```

### Create a store

```bash
csdk store create --name <String> --databaseId <UUID> [--hash <UUID>]
```

### Get a store by id

```bash
csdk store get --id <value>
```
