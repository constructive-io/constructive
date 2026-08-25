# platformEmailIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformEmailIdentity records via csdk CLI

## Usage

```bash
csdk platform-email-identity list
csdk platform-email-identity list --where.<field>.<op> <value> --orderBy <values>
csdk platform-email-identity list --limit 10 --after <cursor>
csdk platform-email-identity find-first --where.<field>.<op> <value>
csdk platform-email-identity get --id <UUID>
csdk platform-email-identity create --fromAddress <String> --name <String> [--fromName <String>] [--isActive <Boolean>] [--isDefault <Boolean>] [--providerAccountId <UUID>] [--replyToAddress <String>] [--supportAddress <String>] [--transportMode <String>]
csdk platform-email-identity update --id <UUID> [--fromAddress <String>] [--fromName <String>] [--isActive <Boolean>] [--isDefault <Boolean>] [--name <String>] [--providerAccountId <UUID>] [--replyToAddress <String>] [--supportAddress <String>] [--transportMode <String>]
csdk platform-email-identity delete --id <UUID>
```

## Examples

### List platformEmailIdentity records

```bash
csdk platform-email-identity list
```

### List platformEmailIdentity records with pagination

```bash
csdk platform-email-identity list --limit 10 --offset 0
```

### List platformEmailIdentity records with cursor pagination

```bash
csdk platform-email-identity list --limit 10 --after <cursor>
```

### Find first matching platformEmailIdentity

```bash
csdk platform-email-identity find-first --where.id.equalTo <value>
```

### List platformEmailIdentity records with field selection

```bash
csdk platform-email-identity list --select id,id
```

### List platformEmailIdentity records with filtering and ordering

```bash
csdk platform-email-identity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformEmailIdentity

```bash
csdk platform-email-identity create --fromAddress <String> --name <String> [--fromName <String>] [--isActive <Boolean>] [--isDefault <Boolean>] [--providerAccountId <UUID>] [--replyToAddress <String>] [--supportAddress <String>] [--transportMode <String>]
```

### Get a platformEmailIdentity by id

```bash
csdk platform-email-identity get --id <value>
```
