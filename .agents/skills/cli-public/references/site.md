# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Site records via csdk CLI

## Usage

```bash
csdk site list
csdk site get --id <UUID>
csdk site create --databaseId <UUID> [--title <String>] [--description <String>] [--ogImage <Image>] [--favicon <Attachment>] [--appleTouchIcon <Image>] [--logo <Image>] [--dbname <String>]
csdk site update --id <UUID> [--databaseId <UUID>] [--title <String>] [--description <String>] [--ogImage <Image>] [--favicon <Attachment>] [--appleTouchIcon <Image>] [--logo <Image>] [--dbname <String>]
csdk site delete --id <UUID>
```

## Examples

### List all site records

```bash
csdk site list
```

### Create a site

```bash
csdk site create --databaseId <UUID> [--title <String>] [--description <String>] [--ogImage <Image>] [--favicon <Attachment>] [--appleTouchIcon <Image>] [--logo <Image>] [--dbname <String>]
```

### Get a site by id

```bash
csdk site get --id <value>
```
