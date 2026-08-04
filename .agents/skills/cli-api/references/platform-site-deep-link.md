# platformSiteDeepLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSiteDeepLink records via csdk CLI

## Usage

```bash
csdk platform-site-deep-link list
csdk platform-site-deep-link list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site-deep-link list --limit 10 --after <cursor>
csdk platform-site-deep-link find-first --where.<field>.<op> <value>
csdk platform-site-deep-link get --id <UUID>
csdk platform-site-deep-link create --appPath <String> --siteId <UUID> --slug <String> [--fallbackUrl <String>] [--metadata <JSON>] [--webPath <String>]
csdk platform-site-deep-link update --id <UUID> [--appPath <String>] [--fallbackUrl <String>] [--metadata <JSON>] [--siteId <UUID>] [--slug <String>] [--webPath <String>]
csdk platform-site-deep-link delete --id <UUID>
```

## Examples

### List platformSiteDeepLink records

```bash
csdk platform-site-deep-link list
```

### List platformSiteDeepLink records with pagination

```bash
csdk platform-site-deep-link list --limit 10 --offset 0
```

### List platformSiteDeepLink records with cursor pagination

```bash
csdk platform-site-deep-link list --limit 10 --after <cursor>
```

### Find first matching platformSiteDeepLink

```bash
csdk platform-site-deep-link find-first --where.id.equalTo <value>
```

### List platformSiteDeepLink records with field selection

```bash
csdk platform-site-deep-link list --select id,id
```

### List platformSiteDeepLink records with filtering and ordering

```bash
csdk platform-site-deep-link list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSiteDeepLink

```bash
csdk platform-site-deep-link create --appPath <String> --siteId <UUID> --slug <String> [--fallbackUrl <String>] [--metadata <JSON>] [--webPath <String>]
```

### Get a platformSiteDeepLink by id

```bash
csdk platform-site-deep-link get --id <value>
```
