# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for App records via csdk CLI

## Usage

```bash
csdk app list
csdk app get --id <UUID>
csdk app create --databaseId <UUID> --siteId <UUID> [--name <String>] [--appImage <Image>] [--appStoreLink <Url>] [--appStoreId <String>] [--appIdPrefix <String>] [--playStoreLink <Url>]
csdk app update --id <UUID> [--databaseId <UUID>] [--siteId <UUID>] [--name <String>] [--appImage <Image>] [--appStoreLink <Url>] [--appStoreId <String>] [--appIdPrefix <String>] [--playStoreLink <Url>]
csdk app delete --id <UUID>
```

## Examples

### List all app records

```bash
csdk app list
```

### Create a app

```bash
csdk app create --databaseId <UUID> --siteId <UUID> [--name <String>] [--appImage <Image>] [--appStoreLink <Url>] [--appStoreId <String>] [--appIdPrefix <String>] [--playStoreLink <Url>]
```

### Get a app by id

```bash
csdk app get --id <value>
```
