# emailSiteIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EmailSiteIdentity records via csdk CLI

## Usage

```bash
csdk email-site-identity list
csdk email-site-identity list --where.<field>.<op> <value> --orderBy <values>
csdk email-site-identity list --limit 10 --after <cursor>
csdk email-site-identity find-first --where.<field>.<op> <value>
csdk email-site-identity get --id <UUID>
csdk email-site-identity create --databaseId <UUID> --emailIdentityId <UUID> --siteId <UUID>
csdk email-site-identity update --id <UUID> [--databaseId <UUID>] [--emailIdentityId <UUID>] [--siteId <UUID>]
csdk email-site-identity delete --id <UUID>
```

## Examples

### List emailSiteIdentity records

```bash
csdk email-site-identity list
```

### List emailSiteIdentity records with pagination

```bash
csdk email-site-identity list --limit 10 --offset 0
```

### List emailSiteIdentity records with cursor pagination

```bash
csdk email-site-identity list --limit 10 --after <cursor>
```

### Find first matching emailSiteIdentity

```bash
csdk email-site-identity find-first --where.id.equalTo <value>
```

### List emailSiteIdentity records with field selection

```bash
csdk email-site-identity list --select id,id
```

### List emailSiteIdentity records with filtering and ordering

```bash
csdk email-site-identity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a emailSiteIdentity

```bash
csdk email-site-identity create --databaseId <UUID> --emailIdentityId <UUID> --siteId <UUID>
```

### Get a emailSiteIdentity by id

```bash
csdk email-site-identity get --id <value>
```
