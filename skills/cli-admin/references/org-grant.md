# orgGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgGrant records via csdk CLI

## Usage

```bash
csdk org-grant list
csdk org-grant get --id <value>
csdk org-grant create --permissions <value> --isGrant <value> --actorId <value> --entityId <value> --grantorId <value>
csdk org-grant update --id <value> [--permissions <value>] [--isGrant <value>] [--actorId <value>] [--entityId <value>] [--grantorId <value>]
csdk org-grant delete --id <value>
```

## Examples

### List all orgGrant records

```bash
csdk org-grant list
```

### Create a orgGrant

```bash
csdk org-grant create --permissions "value" --isGrant "value" --actorId "value" --entityId "value" --grantorId "value"
```

### Get a orgGrant by id

```bash
csdk org-grant get --id <value>
```
