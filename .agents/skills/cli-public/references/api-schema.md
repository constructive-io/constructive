# apiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ApiSchema records via csdk CLI

## Usage

```bash
csdk api-schema list
csdk api-schema get --id <UUID>
csdk api-schema create --databaseId <UUID> --schemaId <UUID> --apiId <UUID>
csdk api-schema update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--apiId <UUID>]
csdk api-schema delete --id <UUID>
```

## Examples

### List all apiSchema records

```bash
csdk api-schema list
```

### Create a apiSchema

```bash
csdk api-schema create --databaseId <UUID> --schemaId <UUID> --apiId <UUID>
```

### Get a apiSchema by id

```bash
csdk api-schema get --id <value>
```
