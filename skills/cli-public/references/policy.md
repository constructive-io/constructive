# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Policy records via csdk CLI

## Usage

```bash
csdk policy list
csdk policy get --id <value>
csdk policy create --tableId <value> --nameTrgmSimilarity <value> --granteeNameTrgmSimilarity <value> --privilegeTrgmSimilarity <value> --policyTypeTrgmSimilarity <value> --moduleTrgmSimilarity <value> --searchScore <value> [--databaseId <value>] [--name <value>] [--granteeName <value>] [--privilege <value>] [--permissive <value>] [--disabled <value>] [--policyType <value>] [--data <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk policy update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--granteeName <value>] [--privilege <value>] [--permissive <value>] [--disabled <value>] [--policyType <value>] [--data <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>] [--nameTrgmSimilarity <value>] [--granteeNameTrgmSimilarity <value>] [--privilegeTrgmSimilarity <value>] [--policyTypeTrgmSimilarity <value>] [--moduleTrgmSimilarity <value>] [--searchScore <value>]
csdk policy delete --id <value>
```

## Examples

### List all policy records

```bash
csdk policy list
```

### Create a policy

```bash
csdk policy create --tableId <value> --nameTrgmSimilarity <value> --granteeNameTrgmSimilarity <value> --privilegeTrgmSimilarity <value> --policyTypeTrgmSimilarity <value> --moduleTrgmSimilarity <value> --searchScore <value> [--databaseId <value>] [--name <value>] [--granteeName <value>] [--privilege <value>] [--permissive <value>] [--disabled <value>] [--policyType <value>] [--data <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
```

### Get a policy by id

```bash
csdk policy get --id <value>
```
