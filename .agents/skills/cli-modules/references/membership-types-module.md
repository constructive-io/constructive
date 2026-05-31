# membershipTypesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MembershipTypesModule records via csdk CLI

## Usage

```bash
csdk membership-types-module list
csdk membership-types-module list --where.<field>.<op> <value> --orderBy <values>
csdk membership-types-module list --limit 10 --after <cursor>
csdk membership-types-module find-first --where.<field>.<op> <value>
csdk membership-types-module get --id <UUID>
csdk membership-types-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk membership-types-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk membership-types-module delete --id <UUID>
```

## Examples

### List membershipTypesModule records

```bash
csdk membership-types-module list
```

### List membershipTypesModule records with pagination

```bash
csdk membership-types-module list --limit 10 --offset 0
```

### List membershipTypesModule records with cursor pagination

```bash
csdk membership-types-module list --limit 10 --after <cursor>
```

### Find first matching membershipTypesModule

```bash
csdk membership-types-module find-first --where.id.equalTo <value>
```

### List membershipTypesModule records with field selection

```bash
csdk membership-types-module list --select id,id
```

### List membershipTypesModule records with filtering and ordering

```bash
csdk membership-types-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a membershipTypesModule

```bash
csdk membership-types-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a membershipTypesModule by id

```bash
csdk membership-types-module get --id <value>
```
