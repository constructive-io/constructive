# orgGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgGrant records via csdk CLI

## Usage

```bash
csdk org-grant list
csdk org-grant list --where.<field>.<op> <value> --orderBy <values>
csdk org-grant list --limit 10 --after <cursor>
csdk org-grant find-first --where.<field>.<op> <value>
csdk org-grant get --id <UUID>
csdk org-grant create --actorId <UUID> --entityId <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--grantorId <UUID>]
csdk org-grant update --id <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--actorId <UUID>] [--entityId <UUID>] [--grantorId <UUID>]
csdk org-grant delete --id <UUID>
```

## Examples

### List orgGrant records

```bash
csdk org-grant list
```

### List orgGrant records with pagination

```bash
csdk org-grant list --limit 10 --offset 0
```

### List orgGrant records with cursor pagination

```bash
csdk org-grant list --limit 10 --after <cursor>
```

### Find first matching orgGrant

```bash
csdk org-grant find-first --where.id.equalTo <value>
```

### List orgGrant records with field selection

```bash
csdk org-grant list --select id,id
```

### List orgGrant records with filtering and ordering

```bash
csdk org-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgGrant

```bash
csdk org-grant create --actorId <UUID> --entityId <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a orgGrant by id

```bash
csdk org-grant get --id <value>
```
