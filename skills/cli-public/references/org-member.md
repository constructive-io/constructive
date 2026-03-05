# orgMember

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMember records via app CLI

## Usage

```bash
app org-member list
app org-member get --id <value>
app org-member create --isAdmin <value> --actorId <value> --entityId <value>
app org-member update --id <value> [--isAdmin <value>] [--actorId <value>] [--entityId <value>]
app org-member delete --id <value>
```

## Examples

### List all orgMember records

```bash
app org-member list
```

### Create a orgMember

```bash
app org-member create --isAdmin "value" --actorId "value" --entityId "value"
```

### Get a orgMember by id

```bash
app org-member get --id <value>
```
