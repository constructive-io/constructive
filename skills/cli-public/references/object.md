# object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Object records via app CLI

## Usage

```bash
app object list
app object get --id <value>
app object create --hashUuid <value> --databaseId <value> --kids <value> --ktree <value> --data <value> --frzn <value>
app object update --id <value> [--hashUuid <value>] [--databaseId <value>] [--kids <value>] [--ktree <value>] [--data <value>] [--frzn <value>]
app object delete --id <value>
```

## Examples

### List all object records

```bash
app object list
```

### Create a object

```bash
app object create --hashUuid "value" --databaseId "value" --kids "value" --ktree "value" --data "value" --frzn "value"
```

### Get a object by id

```bash
app object get --id <value>
```
