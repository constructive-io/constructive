# orgMember

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMember records via csdk CLI

## Usage

```bash
csdk org-member list
csdk org-member get --id <UUID>
csdk org-member create --actorId <UUID> --entityId <UUID> [--isAdmin <Boolean>]
csdk org-member update --id <UUID> [--isAdmin <Boolean>] [--actorId <UUID>] [--entityId <UUID>]
csdk org-member delete --id <UUID>
```

## Examples

### List all orgMember records

```bash
csdk org-member list
```

### Create a orgMember

```bash
csdk org-member create --actorId <UUID> --entityId <UUID> [--isAdmin <Boolean>]
```

### Get a orgMember by id

```bash
csdk org-member get --id <value>
```
