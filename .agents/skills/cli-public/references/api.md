# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Api records via csdk CLI

## Usage

```bash
csdk api list
csdk api get --id <UUID>
csdk api create --databaseId <UUID> --name <String> [--dbname <String>] [--roleName <String>] [--anonRole <String>] [--isPublic <Boolean>]
csdk api update --id <UUID> [--databaseId <UUID>] [--name <String>] [--dbname <String>] [--roleName <String>] [--anonRole <String>] [--isPublic <Boolean>]
csdk api delete --id <UUID>
```

## Examples

### List all api records

```bash
csdk api list
```

### Create a api

```bash
csdk api create --databaseId <UUID> --name <String> [--dbname <String>] [--roleName <String>] [--anonRole <String>] [--isPublic <Boolean>]
```

### Get a api by id

```bash
csdk api get --id <value>
```
