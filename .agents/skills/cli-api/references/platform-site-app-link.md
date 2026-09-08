# platformSiteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSiteAppLink records via csdk CLI

## Usage

```bash
csdk platform-site-app-link list
csdk platform-site-app-link list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site-app-link list --limit 10 --after <cursor>
csdk platform-site-app-link find-first --where.<field>.<op> <value>
csdk platform-site-app-link get --id <UUID>
csdk platform-site-app-link create --appStoreIdentityId <UUID> --siteId <UUID> [--pathComponents <String>] [--webcredentials <Boolean>]
csdk platform-site-app-link update --id <UUID> [--appStoreIdentityId <UUID>] [--pathComponents <String>] [--siteId <UUID>] [--webcredentials <Boolean>]
csdk platform-site-app-link delete --id <UUID>
```

## Examples

### List platformSiteAppLink records

```bash
csdk platform-site-app-link list
```

### List platformSiteAppLink records with pagination

```bash
csdk platform-site-app-link list --limit 10 --offset 0
```

### List platformSiteAppLink records with cursor pagination

```bash
csdk platform-site-app-link list --limit 10 --after <cursor>
```

### Find first matching platformSiteAppLink

```bash
csdk platform-site-app-link find-first --where.id.equalTo <value>
```

### List platformSiteAppLink records with field selection

```bash
csdk platform-site-app-link list --select id,id
```

### List platformSiteAppLink records with filtering and ordering

```bash
csdk platform-site-app-link list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSiteAppLink

```bash
csdk platform-site-app-link create --appStoreIdentityId <UUID> --siteId <UUID> [--pathComponents <String>] [--webcredentials <Boolean>]
```

### Get a platformSiteAppLink by id

```bash
csdk platform-site-app-link get --id <value>
```
