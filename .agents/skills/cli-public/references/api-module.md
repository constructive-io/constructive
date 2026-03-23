# apiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ApiModule records via csdk CLI

## Usage

```bash
csdk api-module list
csdk api-module get --id <UUID>
csdk api-module create --databaseId <UUID> --apiId <UUID> --name <String> --data <JSON>
csdk api-module update --id <UUID> [--databaseId <UUID>] [--apiId <UUID>] [--name <String>] [--data <JSON>]
csdk api-module delete --id <UUID>
```

## Examples

### List all apiModule records

```bash
csdk api-module list
```

### Create a apiModule

```bash
csdk api-module create --databaseId <UUID> --apiId <UUID> --name <String> --data <JSON>
```

### Get a apiModule by id

```bash
csdk api-module get --id <value>
```
