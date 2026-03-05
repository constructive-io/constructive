# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Api records via app CLI

## Usage

```bash
app api list
app api get --id <value>
app api create --databaseId <value> --name <value> --dbname <value> --roleName <value> --anonRole <value> --isPublic <value>
app api update --id <value> [--databaseId <value>] [--name <value>] [--dbname <value>] [--roleName <value>] [--anonRole <value>] [--isPublic <value>]
app api delete --id <value>
```

## Examples

### List all api records

```bash
app api list
```

### Create a api

```bash
app api create --databaseId "value" --name "value" --dbname "value" --roleName "value" --anonRole "value" --isPublic "value"
```

### Get a api by id

```bash
app api get --id <value>
```
