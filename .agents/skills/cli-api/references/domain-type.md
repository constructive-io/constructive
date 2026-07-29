# domainType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DomainType records via csdk CLI

## Usage

```bash
csdk domain-type list
csdk domain-type list --where.<field>.<op> <value> --orderBy <values>
csdk domain-type list --limit 10 --after <cursor>
csdk domain-type find-first --where.<field>.<op> <value>
csdk domain-type get --id <UUID>
csdk domain-type create --baseType <JSON> --databaseId <UUID> --name <String> --schemaId <UUID> [--category <ObjectCategory>] [--checkExpr <JSON>] [--defaultExpr <JSON>] [--description <String>] [--label <String>] [--notNull <Boolean>] [--smartTags <JSON>] [--tags <String>]
csdk domain-type update --id <UUID> [--baseType <JSON>] [--category <ObjectCategory>] [--checkExpr <JSON>] [--databaseId <UUID>] [--defaultExpr <JSON>] [--description <String>] [--label <String>] [--name <String>] [--notNull <Boolean>] [--schemaId <UUID>] [--smartTags <JSON>] [--tags <String>]
csdk domain-type delete --id <UUID>
```

## Examples

### List domainType records

```bash
csdk domain-type list
```

### List domainType records with pagination

```bash
csdk domain-type list --limit 10 --offset 0
```

### List domainType records with cursor pagination

```bash
csdk domain-type list --limit 10 --after <cursor>
```

### Find first matching domainType

```bash
csdk domain-type find-first --where.id.equalTo <value>
```

### List domainType records with field selection

```bash
csdk domain-type list --select id,id
```

### List domainType records with filtering and ordering

```bash
csdk domain-type list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a domainType

```bash
csdk domain-type create --baseType <JSON> --databaseId <UUID> --name <String> --schemaId <UUID> [--category <ObjectCategory>] [--checkExpr <JSON>] [--defaultExpr <JSON>] [--description <String>] [--label <String>] [--notNull <Boolean>] [--smartTags <JSON>] [--tags <String>]
```

### Get a domainType by id

```bash
csdk domain-type get --id <value>
```
