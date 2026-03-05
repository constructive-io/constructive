# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for App records via app CLI

## Usage

```bash
app app list
app app get --id <value>
app app create --databaseId <value> --siteId <value> --name <value> --appImage <value> --appStoreLink <value> --appStoreId <value> --appIdPrefix <value> --playStoreLink <value>
app app update --id <value> [--databaseId <value>] [--siteId <value>] [--name <value>] [--appImage <value>] [--appStoreLink <value>] [--appStoreId <value>] [--appIdPrefix <value>] [--playStoreLink <value>]
app app delete --id <value>
```

## Examples

### List all app records

```bash
app app list
```

### Create a app

```bash
app app create --databaseId "value" --siteId "value" --name "value" --appImage "value" --appStoreLink "value" --appStoreId "value" --appIdPrefix "value" --playStoreLink "value"
```

### Get a app by id

```bash
app app get --id <value>
```
