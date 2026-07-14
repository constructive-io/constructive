# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Table records via csdk CLI

## Usage

```bash
csdk table list
csdk table list --where.<field>.<op> <value> --orderBy <values>
csdk table list --limit 10 --after <cursor>
csdk table find-first --where.<field>.<op> <value>
csdk table get --id <UUID>
csdk table create --name <String> --schemaId <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--description <String>] [--inheritsId <UUID>] [--label <String>] [--partitionKeyNames <String>] [--partitionKeyTypes <String>] [--partitionStrategy <String>] [--partitioned <Boolean>] [--peoplestamps <Boolean>] [--pluralName <String>] [--singularName <String>] [--smartTags <JSON>] [--stepUp <JSON>] [--tags <String>] [--timestamps <Boolean>] [--useRls <Boolean>]
csdk table update --id <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--description <String>] [--inheritsId <UUID>] [--label <String>] [--name <String>] [--partitionKeyNames <String>] [--partitionKeyTypes <String>] [--partitionStrategy <String>] [--partitioned <Boolean>] [--peoplestamps <Boolean>] [--pluralName <String>] [--schemaId <UUID>] [--singularName <String>] [--smartTags <JSON>] [--stepUp <JSON>] [--tags <String>] [--timestamps <Boolean>] [--useRls <Boolean>]
csdk table delete --id <UUID>
```

## Examples

### List table records

```bash
csdk table list
```

### List table records with pagination

```bash
csdk table list --limit 10 --offset 0
```

### List table records with cursor pagination

```bash
csdk table list --limit 10 --after <cursor>
```

### Find first matching table

```bash
csdk table find-first --where.id.equalTo <value>
```

### List table records with field selection

```bash
csdk table list --select id,id
```

### List table records with filtering and ordering

```bash
csdk table list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a table

```bash
csdk table create --name <String> --schemaId <UUID> [--category <ObjectCategory>] [--databaseId <UUID>] [--description <String>] [--inheritsId <UUID>] [--label <String>] [--partitionKeyNames <String>] [--partitionKeyTypes <String>] [--partitionStrategy <String>] [--partitioned <Boolean>] [--peoplestamps <Boolean>] [--pluralName <String>] [--singularName <String>] [--smartTags <JSON>] [--stepUp <JSON>] [--tags <String>] [--timestamps <Boolean>] [--useRls <Boolean>]
```

### Get a table by id

```bash
csdk table get --id <value>
```
