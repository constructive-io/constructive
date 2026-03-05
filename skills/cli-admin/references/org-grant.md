# orgGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgGrant records via app CLI

## Usage

```bash
app org-grant list
app org-grant get --id <value>
app org-grant create --permissions <value> --isGrant <value> --actorId <value> --entityId <value> --grantorId <value>
app org-grant update --id <value> [--permissions <value>] [--isGrant <value>] [--actorId <value>] [--entityId <value>] [--grantorId <value>]
app org-grant delete --id <value>
```

## Examples

### List all orgGrant records

```bash
app org-grant list
```

### Create a orgGrant

```bash
app org-grant create --permissions "value" --isGrant "value" --actorId "value" --entityId "value" --grantorId "value"
```

### Get a orgGrant by id

```bash
app org-grant get --id <value>
```
