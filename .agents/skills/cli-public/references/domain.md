# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Domain records via csdk CLI

## Usage

```bash
csdk domain list
csdk domain list --where.<field>.<op> <value> --orderBy <values>
csdk domain list --limit 10 --after <cursor>
csdk domain find-first --where.<field>.<op> <value>
csdk domain get --id <UUID>
csdk domain create --databaseId <UUID> [--apiId <UUID>] [--siteId <UUID>] [--subdomain <Hostname>] [--domain <Hostname>]
csdk domain update --id <UUID> [--databaseId <UUID>] [--apiId <UUID>] [--siteId <UUID>] [--subdomain <Hostname>] [--domain <Hostname>]
csdk domain delete --id <UUID>
```

## Examples

### List domain records

```bash
csdk domain list
```

### List domain records with pagination

```bash
csdk domain list --limit 10 --offset 0
```

### List domain records with cursor pagination

```bash
csdk domain list --limit 10 --after <cursor>
```

### Find first matching domain

```bash
csdk domain find-first --where.id.equalTo <value>
```

### List domain records with field selection

```bash
csdk domain list --select id,id
```

### List domain records with filtering and ordering

```bash
csdk domain list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a domain

```bash
csdk domain create --databaseId <UUID> [--apiId <UUID>] [--siteId <UUID>] [--subdomain <Hostname>] [--domain <Hostname>]
```

### Get a domain by id

```bash
csdk domain get --id <value>
```
