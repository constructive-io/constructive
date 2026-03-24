# ref

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Ref records via csdk CLI

## Usage

```bash
csdk ref list
csdk ref get --id <UUID>
csdk ref create --name <String> --databaseId <UUID> --storeId <UUID> [--commitId <UUID>]
csdk ref update --id <UUID> [--name <String>] [--databaseId <UUID>] [--storeId <UUID>] [--commitId <UUID>]
csdk ref delete --id <UUID>
```

## Examples

### List all ref records

```bash
csdk ref list
```

### Create a ref

```bash
csdk ref create --name <String> --databaseId <UUID> --storeId <UUID> [--commitId <UUID>]
```

### Get a ref by id

```bash
csdk ref get --id <value>
```
