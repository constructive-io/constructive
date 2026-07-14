# orgMemberProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMemberProfile records via csdk CLI

## Usage

```bash
csdk org-member-profile list
csdk org-member-profile list --where.<field>.<op> <value> --orderBy <values>
csdk org-member-profile list --limit 10 --after <cursor>
csdk org-member-profile find-first --where.<field>.<op> <value>
csdk org-member-profile get --id <UUID>
csdk org-member-profile create --actorId <UUID> --entityId <UUID> --membershipId <UUID> [--bio <String>] [--displayName <String>] [--email <String>] [--profilePicture <Image>] [--title <String>]
csdk org-member-profile update --id <UUID> [--actorId <UUID>] [--bio <String>] [--displayName <String>] [--email <String>] [--entityId <UUID>] [--membershipId <UUID>] [--profilePicture <Image>] [--title <String>]
csdk org-member-profile delete --id <UUID>
```

## Examples

### List orgMemberProfile records

```bash
csdk org-member-profile list
```

### List orgMemberProfile records with pagination

```bash
csdk org-member-profile list --limit 10 --offset 0
```

### List orgMemberProfile records with cursor pagination

```bash
csdk org-member-profile list --limit 10 --after <cursor>
```

### Find first matching orgMemberProfile

```bash
csdk org-member-profile find-first --where.id.equalTo <value>
```

### List orgMemberProfile records with field selection

```bash
csdk org-member-profile list --select id,id
```

### List orgMemberProfile records with filtering and ordering

```bash
csdk org-member-profile list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgMemberProfile

```bash
csdk org-member-profile create --actorId <UUID> --entityId <UUID> --membershipId <UUID> [--bio <String>] [--displayName <String>] [--email <String>] [--profilePicture <Image>] [--title <String>]
```

### Get a orgMemberProfile by id

```bash
csdk org-member-profile get --id <value>
```
