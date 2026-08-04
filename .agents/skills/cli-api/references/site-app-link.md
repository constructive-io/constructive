# siteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteAppLink records via csdk CLI

## Usage

```bash
csdk site-app-link list
csdk site-app-link list --where.<field>.<op> <value> --orderBy <values>
csdk site-app-link list --limit 10 --after <cursor>
csdk site-app-link find-first --where.<field>.<op> <value>
csdk site-app-link get --id <UUID>
csdk site-app-link create --appIdentifier <String> --databaseId <UUID> --platform <String> --siteId <UUID> [--pathComponents <String>] [--sha256CertFingerprints <String>] [--storeUrl <String>] [--teamId <String>] [--webcredentials <Boolean>]
csdk site-app-link update --id <UUID> [--appIdentifier <String>] [--databaseId <UUID>] [--pathComponents <String>] [--platform <String>] [--sha256CertFingerprints <String>] [--siteId <UUID>] [--storeUrl <String>] [--teamId <String>] [--webcredentials <Boolean>]
csdk site-app-link delete --id <UUID>
```

## Examples

### List siteAppLink records

```bash
csdk site-app-link list
```

### List siteAppLink records with pagination

```bash
csdk site-app-link list --limit 10 --offset 0
```

### List siteAppLink records with cursor pagination

```bash
csdk site-app-link list --limit 10 --after <cursor>
```

### Find first matching siteAppLink

```bash
csdk site-app-link find-first --where.id.equalTo <value>
```

### List siteAppLink records with field selection

```bash
csdk site-app-link list --select id,id
```

### List siteAppLink records with filtering and ordering

```bash
csdk site-app-link list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteAppLink

```bash
csdk site-app-link create --appIdentifier <String> --databaseId <UUID> --platform <String> --siteId <UUID> [--pathComponents <String>] [--sha256CertFingerprints <String>] [--storeUrl <String>] [--teamId <String>] [--webcredentials <Boolean>]
```

### Get a siteAppLink by id

```bash
csdk site-app-link get --id <value>
```
