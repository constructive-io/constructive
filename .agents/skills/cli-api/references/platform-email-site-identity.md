# platformEmailSiteIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformEmailSiteIdentity records via csdk CLI

## Usage

```bash
csdk platform-email-site-identity list
csdk platform-email-site-identity list --where.<field>.<op> <value> --orderBy <values>
csdk platform-email-site-identity list --limit 10 --after <cursor>
csdk platform-email-site-identity find-first --where.<field>.<op> <value>
csdk platform-email-site-identity get --id <UUID>
csdk platform-email-site-identity create --emailIdentityId <UUID> --siteId <UUID>
csdk platform-email-site-identity update --id <UUID> [--emailIdentityId <UUID>] [--siteId <UUID>]
csdk platform-email-site-identity delete --id <UUID>
```

## Examples

### List platformEmailSiteIdentity records

```bash
csdk platform-email-site-identity list
```

### List platformEmailSiteIdentity records with pagination

```bash
csdk platform-email-site-identity list --limit 10 --offset 0
```

### List platformEmailSiteIdentity records with cursor pagination

```bash
csdk platform-email-site-identity list --limit 10 --after <cursor>
```

### Find first matching platformEmailSiteIdentity

```bash
csdk platform-email-site-identity find-first --where.id.equalTo <value>
```

### List platformEmailSiteIdentity records with field selection

```bash
csdk platform-email-site-identity list --select id,id
```

### List platformEmailSiteIdentity records with filtering and ordering

```bash
csdk platform-email-site-identity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformEmailSiteIdentity

```bash
csdk platform-email-site-identity create --emailIdentityId <UUID> --siteId <UUID>
```

### Get a platformEmailSiteIdentity by id

```bash
csdk platform-email-site-identity get --id <value>
```
