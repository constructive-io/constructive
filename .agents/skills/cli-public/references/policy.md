# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Policy records via csdk CLI

## Usage

```bash
csdk policy list
csdk policy get --id <UUID>
csdk policy create --tableId <UUID> [--databaseId <UUID>] [--name <String>] [--granteeName <String>] [--privilege <String>] [--permissive <Boolean>] [--disabled <Boolean>] [--policyType <String>] [--data <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk policy update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--granteeName <String>] [--privilege <String>] [--permissive <Boolean>] [--disabled <Boolean>] [--policyType <String>] [--data <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk policy delete --id <UUID>
```

## Examples

### List all policy records

```bash
csdk policy list
```

### Create a policy

```bash
csdk policy create --tableId <UUID> [--databaseId <UUID>] [--name <String>] [--granteeName <String>] [--privilege <String>] [--permissive <Boolean>] [--disabled <Boolean>] [--policyType <String>] [--data <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a policy by id

```bash
csdk policy get --id <value>
```
