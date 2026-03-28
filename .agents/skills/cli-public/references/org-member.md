# orgMember

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMember records via csdk CLI

## Usage

```bash
csdk org-member list
csdk org-member list --where.<field>.<op> <value> --orderBy <values>
csdk org-member list --limit 10 --after <cursor>
csdk org-member find-first --where.<field>.<op> <value>
csdk org-member get --id <UUID>
csdk org-member create --actorId <UUID> --entityId <UUID> [--isAdmin <Boolean>]
csdk org-member update --id <UUID> [--isAdmin <Boolean>] [--actorId <UUID>] [--entityId <UUID>]
csdk org-member delete --id <UUID>
```

## Examples

### List orgMember records

```bash
csdk org-member list
```

### List orgMember records with pagination

```bash
csdk org-member list --limit 10 --offset 0
```

### List orgMember records with cursor pagination

```bash
csdk org-member list --limit 10 --after <cursor>
```

### Find first matching orgMember

```bash
csdk org-member find-first --where.id.equalTo <value>
```

### List orgMember records with field selection

```bash
csdk org-member list --select id,id
```

### List orgMember records with filtering and ordering

```bash
csdk org-member list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgMember

```bash
csdk org-member create --actorId <UUID> --entityId <UUID> [--isAdmin <Boolean>]
```

### Get a orgMember by id

```bash
csdk org-member get --id <value>
```
