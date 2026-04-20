# orgMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMembershipDefault records via csdk CLI

## Usage

```bash
csdk org-membership-default list
csdk org-membership-default list --where.<field>.<op> <value> --orderBy <values>
csdk org-membership-default list --limit 10 --after <cursor>
csdk org-membership-default find-first --where.<field>.<op> <value>
csdk org-membership-default get --id <UUID>
csdk org-membership-default create --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>]
csdk org-membership-default update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--entityId <UUID>]
csdk org-membership-default delete --id <UUID>
```

## Examples

### List orgMembershipDefault records

```bash
csdk org-membership-default list
```

### List orgMembershipDefault records with pagination

```bash
csdk org-membership-default list --limit 10 --offset 0
```

### List orgMembershipDefault records with cursor pagination

```bash
csdk org-membership-default list --limit 10 --after <cursor>
```

### Find first matching orgMembershipDefault

```bash
csdk org-membership-default find-first --where.id.equalTo <value>
```

### List orgMembershipDefault records with field selection

```bash
csdk org-membership-default list --select id,id
```

### List orgMembershipDefault records with filtering and ordering

```bash
csdk org-membership-default list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgMembershipDefault

```bash
csdk org-membership-default create --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>]
```

### Get a orgMembershipDefault by id

```bash
csdk org-membership-default get --id <value>
```
