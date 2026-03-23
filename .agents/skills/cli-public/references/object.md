# object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Object records via csdk CLI

## Usage

```bash
csdk object list
csdk object get --id <UUID>
csdk object create --databaseId <UUID> [--kids <UUID>] [--ktree <String>] [--data <JSON>] [--frzn <Boolean>]
csdk object update --id <UUID> [--databaseId <UUID>] [--kids <UUID>] [--ktree <String>] [--data <JSON>] [--frzn <Boolean>]
csdk object delete --id <UUID>
```

## Examples

### List all object records

```bash
csdk object list
```

### Create a object

```bash
csdk object create --databaseId <UUID> [--kids <UUID>] [--ktree <String>] [--data <JSON>] [--frzn <Boolean>]
```

### Get a object by id

```bash
csdk object get --id <value>
```
