# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Policy records via app CLI

## Usage

```bash
app policy list
app policy get --id <value>
app policy create --databaseId <value> --tableId <value> --name <value> --granteeName <value> --privilege <value> --permissive <value> --disabled <value> --policyType <value> --data <value> --smartTags <value> --category <value> --module <value> --scope <value> --tags <value>
app policy update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--granteeName <value>] [--privilege <value>] [--permissive <value>] [--disabled <value>] [--policyType <value>] [--data <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
app policy delete --id <value>
```

## Examples

### List all policy records

```bash
app policy list
```

### Create a policy

```bash
app policy create --databaseId "value" --tableId "value" --name "value" --granteeName "value" --privilege "value" --permissive "value" --disabled "value" --policyType "value" --data "value" --smartTags "value" --category "value" --module "value" --scope "value" --tags "value"
```

### Get a policy by id

```bash
app policy get --id <value>
```
