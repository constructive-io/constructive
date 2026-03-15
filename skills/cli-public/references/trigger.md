# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Trigger records via csdk CLI

## Usage

```bash
csdk trigger list
csdk trigger get --id <value>
csdk trigger create --tableId <value> --name <value> --nameTrgmSimilarity <value> --eventTrgmSimilarity <value> --functionNameTrgmSimilarity <value> --moduleTrgmSimilarity <value> --searchScore <value> [--databaseId <value>] [--event <value>] [--functionName <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk trigger update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--event <value>] [--functionName <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>] [--nameTrgmSimilarity <value>] [--eventTrgmSimilarity <value>] [--functionNameTrgmSimilarity <value>] [--moduleTrgmSimilarity <value>] [--searchScore <value>]
csdk trigger delete --id <value>
```

## Examples

### List all trigger records

```bash
csdk trigger list
```

### Create a trigger

```bash
csdk trigger create --tableId <value> --name <value> --nameTrgmSimilarity <value> --eventTrgmSimilarity <value> --functionNameTrgmSimilarity <value> --moduleTrgmSimilarity <value> --searchScore <value> [--databaseId <value>] [--event <value>] [--functionName <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
```

### Get a trigger by id

```bash
csdk trigger get --id <value>
```
