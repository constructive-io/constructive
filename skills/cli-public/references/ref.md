# ref

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Ref records via csdk CLI

## Usage

```bash
csdk ref list
csdk ref get --id <value>
csdk ref create --name <value> --databaseId <value> --storeId <value> --commitId <value>
csdk ref update --id <value> [--name <value>] [--databaseId <value>] [--storeId <value>] [--commitId <value>]
csdk ref delete --id <value>
```

## Examples

### List all ref records

```bash
csdk ref list
```

### Create a ref

```bash
csdk ref create --name "value" --databaseId "value" --storeId "value" --commitId "value"
```

### Get a ref by id

```bash
csdk ref get --id <value>
```
