# membershipType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MembershipType records via csdk CLI

## Usage

```bash
csdk membership-type list
csdk membership-type list --where.<field>.<op> <value> --orderBy <values>
csdk membership-type list --limit 10 --after <cursor>
csdk membership-type find-first --where.<field>.<op> <value>
csdk membership-type get --id <Int>
csdk membership-type create --description <String> --name <String> --scope <String> [--hasUsersTableEntry <Boolean>] [--parentMembershipType <Int>]
csdk membership-type update --id <Int> [--description <String>] [--hasUsersTableEntry <Boolean>] [--name <String>] [--parentMembershipType <Int>] [--scope <String>]
csdk membership-type delete --id <Int>
```

## Examples

### List membershipType records

```bash
csdk membership-type list
```

### List membershipType records with pagination

```bash
csdk membership-type list --limit 10 --offset 0
```

### List membershipType records with cursor pagination

```bash
csdk membership-type list --limit 10 --after <cursor>
```

### Find first matching membershipType

```bash
csdk membership-type find-first --where.id.equalTo <value>
```

### List membershipType records with field selection

```bash
csdk membership-type list --select id,id
```

### List membershipType records with filtering and ordering

```bash
csdk membership-type list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a membershipType

```bash
csdk membership-type create --description <String> --name <String> --scope <String> [--hasUsersTableEntry <Boolean>] [--parentMembershipType <Int>]
```

### Get a membershipType by id

```bash
csdk membership-type get --id <value>
```
