# schemaGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SchemaGrant records via app CLI

## Usage

```bash
app schema-grant list
app schema-grant get --id <value>
app schema-grant create --databaseId <value> --schemaId <value> --granteeName <value>
app schema-grant update --id <value> [--databaseId <value>] [--schemaId <value>] [--granteeName <value>]
app schema-grant delete --id <value>
```

## Examples

### List all schemaGrant records

```bash
app schema-grant list
```

### Create a schemaGrant

```bash
app schema-grant create --databaseId "value" --schemaId "value" --granteeName "value"
```

### Get a schemaGrant by id

```bash
app schema-grant get --id <value>
```
