# field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Field records via csdk CLI

## Usage

```bash
csdk field list
csdk field get --id <UUID>
csdk field create --tableId <UUID> --name <String> --type <String> [--databaseId <UUID>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--defaultValue <String>] [--defaultValueAst <JSON>] [--fieldOrder <Int>] [--regexp <String>] [--chk <JSON>] [--chkExpr <JSON>] [--min <Float>] [--max <Float>] [--tags <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>]
csdk field update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--defaultValue <String>] [--defaultValueAst <JSON>] [--type <String>] [--fieldOrder <Int>] [--regexp <String>] [--chk <JSON>] [--chkExpr <JSON>] [--min <Float>] [--max <Float>] [--tags <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>]
csdk field delete --id <UUID>
```

## Examples

### List all field records

```bash
csdk field list
```

### Create a field

```bash
csdk field create --tableId <UUID> --name <String> --type <String> [--databaseId <UUID>] [--label <String>] [--description <String>] [--smartTags <JSON>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--defaultValue <String>] [--defaultValueAst <JSON>] [--fieldOrder <Int>] [--regexp <String>] [--chk <JSON>] [--chkExpr <JSON>] [--min <Float>] [--max <Float>] [--tags <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>]
```

### Get a field by id

```bash
csdk field get --id <value>
```
