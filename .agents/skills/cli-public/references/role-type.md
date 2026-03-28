# roleType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RoleType records via csdk CLI

## Usage

```bash
csdk role-type list
csdk role-type list --where.<field>.<op> <value> --orderBy <values>
csdk role-type list --limit 10 --after <cursor>
csdk role-type find-first --where.<field>.<op> <value>
csdk role-type get --id <Int>
csdk role-type create --name <String>
csdk role-type update --id <Int> [--name <String>]
csdk role-type delete --id <Int>
```

## Examples

### List roleType records

```bash
csdk role-type list
```

### List roleType records with pagination

```bash
csdk role-type list --limit 10 --offset 0
```

### List roleType records with cursor pagination

```bash
csdk role-type list --limit 10 --after <cursor>
```

### Find first matching roleType

```bash
csdk role-type find-first --where.id.equalTo <value>
```

### List roleType records with field selection

```bash
csdk role-type list --select id,id
```

### List roleType records with filtering and ordering

```bash
csdk role-type list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a roleType

```bash
csdk role-type create --name <String>
```

### Get a roleType by id

```bash
csdk role-type get --id <value>
```
