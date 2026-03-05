# appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppMembership records via csdk CLI

## Usage

```bash
csdk app-membership list
csdk app-membership get --id <value>
csdk app-membership create --createdBy <value> --updatedBy <value> --isApproved <value> --isBanned <value> --isDisabled <value> --isVerified <value> --isActive <value> --isOwner <value> --isAdmin <value> --permissions <value> --granted <value> --actorId <value> --profileId <value>
csdk app-membership update --id <value> [--createdBy <value>] [--updatedBy <value>] [--isApproved <value>] [--isBanned <value>] [--isDisabled <value>] [--isVerified <value>] [--isActive <value>] [--isOwner <value>] [--isAdmin <value>] [--permissions <value>] [--granted <value>] [--actorId <value>] [--profileId <value>]
csdk app-membership delete --id <value>
```

## Examples

### List all appMembership records

```bash
csdk app-membership list
```

### Create a appMembership

```bash
csdk app-membership create --createdBy "value" --updatedBy "value" --isApproved "value" --isBanned "value" --isDisabled "value" --isVerified "value" --isActive "value" --isOwner "value" --isAdmin "value" --permissions "value" --granted "value" --actorId "value" --profileId "value"
```

### Get a appMembership by id

```bash
csdk app-membership get --id <value>
```
