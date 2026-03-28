# orgLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgLimit records via csdk CLI

## Usage

```bash
csdk org-limit list
csdk org-limit list --where.<field>.<op> <value> --orderBy <values>
csdk org-limit list --limit 10 --after <cursor>
csdk org-limit find-first --where.<field>.<op> <value>
csdk org-limit get --id <UUID>
csdk org-limit create --actorId <UUID> --entityId <UUID> [--name <String>] [--num <Int>] [--max <Int>]
csdk org-limit update --id <UUID> [--name <String>] [--actorId <UUID>] [--num <Int>] [--max <Int>] [--entityId <UUID>]
csdk org-limit delete --id <UUID>
```

## Examples

### List orgLimit records

```bash
csdk org-limit list
```

### List orgLimit records with pagination

```bash
csdk org-limit list --limit 10 --offset 0
```

### List orgLimit records with cursor pagination

```bash
csdk org-limit list --limit 10 --after <cursor>
```

### Find first matching orgLimit

```bash
csdk org-limit find-first --where.id.equalTo <value>
```

### List orgLimit records with field selection

```bash
csdk org-limit list --select id,id
```

### List orgLimit records with filtering and ordering

```bash
csdk org-limit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgLimit

```bash
csdk org-limit create --actorId <UUID> --entityId <UUID> [--name <String>] [--num <Int>] [--max <Int>]
```

### Get a orgLimit by id

```bash
csdk org-limit get --id <value>
```
