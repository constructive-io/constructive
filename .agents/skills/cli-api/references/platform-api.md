# platformApi

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformApi records via csdk CLI

## Usage

```bash
csdk platform-api list
csdk platform-api list --where.<field>.<op> <value> --orderBy <values>
csdk platform-api list --limit 10 --after <cursor>
csdk platform-api find-first --where.<field>.<op> <value>
csdk platform-api get --id <UUID>
csdk platform-api create --name <String> [--anonRole <String>] [--config <JSON>] [--dbname <String>] [--isPublished <Boolean>] [--roleName <String>]
csdk platform-api update --id <UUID> [--anonRole <String>] [--config <JSON>] [--dbname <String>] [--isPublished <Boolean>] [--name <String>] [--roleName <String>]
csdk platform-api delete --id <UUID>
```

## Examples

### List platformApi records

```bash
csdk platform-api list
```

### List platformApi records with pagination

```bash
csdk platform-api list --limit 10 --offset 0
```

### List platformApi records with cursor pagination

```bash
csdk platform-api list --limit 10 --after <cursor>
```

### Find first matching platformApi

```bash
csdk platform-api find-first --where.id.equalTo <value>
```

### List platformApi records with field selection

```bash
csdk platform-api list --select id,id
```

### List platformApi records with filtering and ordering

```bash
csdk platform-api list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformApi

```bash
csdk platform-api create --name <String> [--anonRole <String>] [--config <JSON>] [--dbname <String>] [--isPublished <Boolean>] [--roleName <String>]
```

### Get a platformApi by id

```bash
csdk platform-api get --id <value>
```
