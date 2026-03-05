# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Site records via app CLI

## Usage

```bash
app site list
app site get --id <value>
app site create --databaseId <value> --title <value> --description <value> --ogImage <value> --favicon <value> --appleTouchIcon <value> --logo <value> --dbname <value>
app site update --id <value> [--databaseId <value>] [--title <value>] [--description <value>] [--ogImage <value>] [--favicon <value>] [--appleTouchIcon <value>] [--logo <value>] [--dbname <value>]
app site delete --id <value>
```

## Examples

### List all site records

```bash
app site list
```

### Create a site

```bash
app site create --databaseId "value" --title "value" --description "value" --ogImage "value" --favicon "value" --appleTouchIcon "value" --logo "value" --dbname "value"
```

### Get a site by id

```bash
app site get --id <value>
```
