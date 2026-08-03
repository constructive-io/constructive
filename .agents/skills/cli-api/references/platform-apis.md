# platformApis

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformApis records via csdk CLI

## Usage

```bash
csdk platform-apis list
csdk platform-apis list --where.<field>.<op> <value> --orderBy <values>
csdk platform-apis list --limit 10 --after <cursor>
csdk platform-apis find-first --where.<field>.<op> <value>
csdk platform-apis get --id <UUID>
csdk platform-apis create --name <String> [--anonRole <String>] [--config <JSON>] [--dbname <String>] [--isPublished <Boolean>] [--roleName <String>]
csdk platform-apis update --id <UUID> [--anonRole <String>] [--config <JSON>] [--dbname <String>] [--isPublished <Boolean>] [--name <String>] [--roleName <String>]
csdk platform-apis delete --id <UUID>
```

## Examples

### List platformApis records

```bash
csdk platform-apis list
```

### List platformApis records with pagination

```bash
csdk platform-apis list --limit 10 --offset 0
```

### List platformApis records with cursor pagination

```bash
csdk platform-apis list --limit 10 --after <cursor>
```

### Find first matching platformApis

```bash
csdk platform-apis find-first --where.id.equalTo <value>
```

### List platformApis records with field selection

```bash
csdk platform-apis list --select id,id
```

### List platformApis records with filtering and ordering

```bash
csdk platform-apis list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformApis

```bash
csdk platform-apis create --name <String> [--anonRole <String>] [--config <JSON>] [--dbname <String>] [--isPublished <Boolean>] [--roleName <String>]
```

### Get a platformApis by id

```bash
csdk platform-apis get --id <value>
```
