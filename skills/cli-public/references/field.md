# field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Field records via csdk CLI

## Usage

```bash
csdk field list
csdk field get --id <value>
csdk field create --tableId <value> --name <value> --type <value> [--databaseId <value>] [--label <value>] [--description <value>] [--smartTags <value>] [--isRequired <value>] [--defaultValue <value>] [--defaultValueAst <value>] [--isHidden <value>] [--fieldOrder <value>] [--regexp <value>] [--chk <value>] [--chkExpr <value>] [--min <value>] [--max <value>] [--tags <value>] [--category <value>] [--module <value>] [--scope <value>]
csdk field update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--label <value>] [--description <value>] [--smartTags <value>] [--isRequired <value>] [--defaultValue <value>] [--defaultValueAst <value>] [--isHidden <value>] [--type <value>] [--fieldOrder <value>] [--regexp <value>] [--chk <value>] [--chkExpr <value>] [--min <value>] [--max <value>] [--tags <value>] [--category <value>] [--module <value>] [--scope <value>]
csdk field delete --id <value>
```

## Examples

### List all field records

```bash
csdk field list
```

### Create a field

```bash
csdk field create --tableId <value> --name <value> --type <value> [--databaseId <value>] [--label <value>] [--description <value>] [--smartTags <value>] [--isRequired <value>] [--defaultValue <value>] [--defaultValueAst <value>] [--isHidden <value>] [--fieldOrder <value>] [--regexp <value>] [--chk <value>] [--chkExpr <value>] [--min <value>] [--max <value>] [--tags <value>] [--category <value>] [--module <value>] [--scope <value>]
```

### Get a field by id

```bash
csdk field get --id <value>
```
