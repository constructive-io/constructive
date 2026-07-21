# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Site records via csdk CLI

## Usage

```bash
csdk site list
csdk site list --where.<field>.<op> <value> --orderBy <values>
csdk site list --limit 10 --after <cursor>
csdk site find-first --where.<field>.<op> <value>
csdk site get --id <UUID>
csdk site create --databaseId <UUID> [--annotations <JSON>] [--appleTouchIcon <Image>] [--dbname <String>] [--description <String>] [--favicon <Attachment>] [--labels <JSON>] [--logo <Image>] [--ogImage <Image>] [--title <String>]
csdk site update --id <UUID> [--annotations <JSON>] [--appleTouchIcon <Image>] [--databaseId <UUID>] [--dbname <String>] [--description <String>] [--favicon <Attachment>] [--labels <JSON>] [--logo <Image>] [--ogImage <Image>] [--title <String>]
csdk site delete --id <UUID>
```

## Examples

### List site records

```bash
csdk site list
```

### List site records with pagination

```bash
csdk site list --limit 10 --offset 0
```

### List site records with cursor pagination

```bash
csdk site list --limit 10 --after <cursor>
```

### Find first matching site

```bash
csdk site find-first --where.id.equalTo <value>
```

### List site records with field selection

```bash
csdk site list --select id,id
```

### List site records with filtering and ordering

```bash
csdk site list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a site

```bash
csdk site create --databaseId <UUID> [--annotations <JSON>] [--appleTouchIcon <Image>] [--dbname <String>] [--description <String>] [--favicon <Attachment>] [--labels <JSON>] [--logo <Image>] [--ogImage <Image>] [--title <String>]
```

### Get a site by id

```bash
csdk site get --id <value>
```
