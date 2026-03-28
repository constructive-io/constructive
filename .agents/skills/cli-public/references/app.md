# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for App records via csdk CLI

## Usage

```bash
csdk app list
csdk app list --where.<field>.<op> <value> --orderBy <values>
csdk app list --limit 10 --after <cursor>
csdk app find-first --where.<field>.<op> <value>
csdk app get --id <UUID>
csdk app create --databaseId <UUID> --siteId <UUID> [--name <String>] [--appImage <Image>] [--appStoreLink <Url>] [--appStoreId <String>] [--appIdPrefix <String>] [--playStoreLink <Url>]
csdk app update --id <UUID> [--databaseId <UUID>] [--siteId <UUID>] [--name <String>] [--appImage <Image>] [--appStoreLink <Url>] [--appStoreId <String>] [--appIdPrefix <String>] [--playStoreLink <Url>]
csdk app delete --id <UUID>
```

## Examples

### List app records

```bash
csdk app list
```

### List app records with pagination

```bash
csdk app list --limit 10 --offset 0
```

### List app records with cursor pagination

```bash
csdk app list --limit 10 --after <cursor>
```

### Find first matching app

```bash
csdk app find-first --where.id.equalTo <value>
```

### List app records with field selection

```bash
csdk app list --select id,id
```

### List app records with filtering and ordering

```bash
csdk app list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a app

```bash
csdk app create --databaseId <UUID> --siteId <UUID> [--name <String>] [--appImage <Image>] [--appStoreLink <Url>] [--appStoreId <String>] [--appIdPrefix <String>] [--playStoreLink <Url>]
```

### Get a app by id

```bash
csdk app get --id <value>
```
