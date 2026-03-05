# orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMembership records via csdk CLI

## Usage

```bash
csdk org-membership list
csdk org-membership get --id <value>
csdk org-membership create --createdBy <value> --updatedBy <value> --isApproved <value> --isBanned <value> --isDisabled <value> --isActive <value> --isOwner <value> --isAdmin <value> --permissions <value> --granted <value> --actorId <value> --entityId <value> --profileId <value>
csdk org-membership update --id <value> [--createdBy <value>] [--updatedBy <value>] [--isApproved <value>] [--isBanned <value>] [--isDisabled <value>] [--isActive <value>] [--isOwner <value>] [--isAdmin <value>] [--permissions <value>] [--granted <value>] [--actorId <value>] [--entityId <value>] [--profileId <value>]
csdk org-membership delete --id <value>
```

## Examples

### List all orgMembership records

```bash
csdk org-membership list
```

### Create a orgMembership

```bash
csdk org-membership create --createdBy "value" --updatedBy "value" --isApproved "value" --isBanned "value" --isDisabled "value" --isActive "value" --isOwner "value" --isAdmin "value" --permissions "value" --granted "value" --actorId "value" --entityId "value" --profileId "value"
```

### Get a orgMembership by id

```bash
csdk org-membership get --id <value>
```
