# schemaGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SchemaGrant records via csdk CLI

## Usage

```bash
csdk schema-grant list
csdk schema-grant get --id <value>
csdk schema-grant create --schemaId <value> --granteeName <value> --granteeNameTrgmSimilarity <value> --searchScore <value> [--databaseId <value>]
csdk schema-grant update --id <value> [--databaseId <value>] [--schemaId <value>] [--granteeName <value>] [--granteeNameTrgmSimilarity <value>] [--searchScore <value>]
csdk schema-grant delete --id <value>
```

## Examples

### List all schemaGrant records

```bash
csdk schema-grant list
```

### Create a schemaGrant

```bash
csdk schema-grant create --schemaId <value> --granteeName <value> --granteeNameTrgmSimilarity <value> --searchScore <value> [--databaseId <value>]
```

### Get a schemaGrant by id

```bash
csdk schema-grant get --id <value>
```
