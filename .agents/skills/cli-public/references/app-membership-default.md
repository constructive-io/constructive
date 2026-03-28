# appMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppMembershipDefault records via csdk CLI

## Usage

```bash
csdk app-membership-default list
csdk app-membership-default list --where.<field>.<op> <value> --orderBy <values>
csdk app-membership-default list --limit 10 --after <cursor>
csdk app-membership-default find-first --where.<field>.<op> <value>
csdk app-membership-default get --id <UUID>
csdk app-membership-default create [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isVerified <Boolean>]
csdk app-membership-default update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isVerified <Boolean>]
csdk app-membership-default delete --id <UUID>
```

## Examples

### List appMembershipDefault records

```bash
csdk app-membership-default list
```

### List appMembershipDefault records with pagination

```bash
csdk app-membership-default list --limit 10 --offset 0
```

### List appMembershipDefault records with cursor pagination

```bash
csdk app-membership-default list --limit 10 --after <cursor>
```

### Find first matching appMembershipDefault

```bash
csdk app-membership-default find-first --where.id.equalTo <value>
```

### List appMembershipDefault records with field selection

```bash
csdk app-membership-default list --select id,id
```

### List appMembershipDefault records with filtering and ordering

```bash
csdk app-membership-default list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appMembershipDefault

```bash
csdk app-membership-default create [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isVerified <Boolean>]
```

### Get a appMembershipDefault by id

```bash
csdk app-membership-default get --id <value>
```
