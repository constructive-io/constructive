# orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMembership records via app CLI

## Usage

```bash
app org-membership list
app org-membership get --id <value>
app org-membership create --createdBy <value> --updatedBy <value> --isApproved <value> --isBanned <value> --isDisabled <value> --isActive <value> --isOwner <value> --isAdmin <value> --permissions <value> --granted <value> --actorId <value> --entityId <value> --profileId <value>
app org-membership update --id <value> [--createdBy <value>] [--updatedBy <value>] [--isApproved <value>] [--isBanned <value>] [--isDisabled <value>] [--isActive <value>] [--isOwner <value>] [--isAdmin <value>] [--permissions <value>] [--granted <value>] [--actorId <value>] [--entityId <value>] [--profileId <value>]
app org-membership delete --id <value>
```

## Examples

### List all orgMembership records

```bash
app org-membership list
```

### Create a orgMembership

```bash
app org-membership create --createdBy "value" --updatedBy "value" --isApproved "value" --isBanned "value" --isDisabled "value" --isActive "value" --isOwner "value" --isAdmin "value" --permissions "value" --granted "value" --actorId "value" --entityId "value" --profileId "value"
```

### Get a orgMembership by id

```bash
app org-membership get --id <value>
```
