# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for App records via csdk CLI

## Usage

```bash
csdk app list
csdk app get --id <value>
csdk app create --databaseId <value> --siteId <value> [--name <value>] [--appImage <value>] [--appStoreLink <value>] [--appStoreId <value>] [--appIdPrefix <value>] [--playStoreLink <value>]
csdk app update --id <value> [--databaseId <value>] [--siteId <value>] [--name <value>] [--appImage <value>] [--appStoreLink <value>] [--appStoreId <value>] [--appIdPrefix <value>] [--playStoreLink <value>]
csdk app delete --id <value>
```

## Examples

### List all app records

```bash
csdk app list
```

### Create a app

```bash
csdk app create --databaseId <value> --siteId <value> [--name <value>] [--appImage <value>] [--appStoreLink <value>] [--appStoreId <value>] [--appIdPrefix <value>] [--playStoreLink <value>]
```

### Get a app by id

```bash
csdk app get --id <value>
```
