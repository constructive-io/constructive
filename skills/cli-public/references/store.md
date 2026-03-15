# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Store records via csdk CLI

## Usage

```bash
csdk store list
csdk store get --id <value>
csdk store create --name <value> --databaseId <value> --nameTrgmSimilarity <value> --searchScore <value> [--hash <value>]
csdk store update --id <value> [--name <value>] [--databaseId <value>] [--hash <value>] [--nameTrgmSimilarity <value>] [--searchScore <value>]
csdk store delete --id <value>
```

## Examples

### List all store records

```bash
csdk store list
```

### Create a store

```bash
csdk store create --name <value> --databaseId <value> --nameTrgmSimilarity <value> --searchScore <value> [--hash <value>]
```

### Get a store by id

```bash
csdk store get --id <value>
```
