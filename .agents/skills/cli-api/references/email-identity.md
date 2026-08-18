# emailIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EmailIdentity records via csdk CLI

## Usage

```bash
csdk email-identity list
csdk email-identity list --where.<field>.<op> <value> --orderBy <values>
csdk email-identity list --limit 10 --after <cursor>
csdk email-identity find-first --where.<field>.<op> <value>
csdk email-identity get --id <UUID>
csdk email-identity create --databaseId <UUID> --fromAddress <String> --name <String> [--fromName <String>] [--isActive <Boolean>] [--isDefault <Boolean>] [--providerAccountId <UUID>] [--replyToAddress <String>] [--supportAddress <String>] [--transportMode <String>]
csdk email-identity update --id <UUID> [--databaseId <UUID>] [--fromAddress <String>] [--fromName <String>] [--isActive <Boolean>] [--isDefault <Boolean>] [--name <String>] [--providerAccountId <UUID>] [--replyToAddress <String>] [--supportAddress <String>] [--transportMode <String>]
csdk email-identity delete --id <UUID>
```

## Examples

### List emailIdentity records

```bash
csdk email-identity list
```

### List emailIdentity records with pagination

```bash
csdk email-identity list --limit 10 --offset 0
```

### List emailIdentity records with cursor pagination

```bash
csdk email-identity list --limit 10 --after <cursor>
```

### Find first matching emailIdentity

```bash
csdk email-identity find-first --where.id.equalTo <value>
```

### List emailIdentity records with field selection

```bash
csdk email-identity list --select id,id
```

### List emailIdentity records with filtering and ordering

```bash
csdk email-identity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a emailIdentity

```bash
csdk email-identity create --databaseId <UUID> --fromAddress <String> --name <String> [--fromName <String>] [--isActive <Boolean>] [--isDefault <Boolean>] [--providerAccountId <UUID>] [--replyToAddress <String>] [--supportAddress <String>] [--transportMode <String>]
```

### Get a emailIdentity by id

```bash
csdk email-identity get --id <value>
```
