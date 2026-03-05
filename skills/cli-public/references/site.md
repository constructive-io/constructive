# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Site records via csdk CLI

## Usage

```bash
csdk site list
csdk site get --id <value>
csdk site create --databaseId <value> --title <value> --description <value> --ogImage <value> --favicon <value> --appleTouchIcon <value> --logo <value> --dbname <value>
csdk site update --id <value> [--databaseId <value>] [--title <value>] [--description <value>] [--ogImage <value>] [--favicon <value>] [--appleTouchIcon <value>] [--logo <value>] [--dbname <value>]
csdk site delete --id <value>
```

## Examples

### List all site records

```bash
csdk site list
```

### Create a site

```bash
csdk site create --databaseId "value" --title "value" --description "value" --ogImage "value" --favicon "value" --appleTouchIcon "value" --logo "value" --dbname "value"
```

### Get a site by id

```bash
csdk site get --id <value>
```
