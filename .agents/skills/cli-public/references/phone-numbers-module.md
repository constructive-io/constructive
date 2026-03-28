# phoneNumbersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PhoneNumbersModule records via csdk CLI

## Usage

```bash
csdk phone-numbers-module list
csdk phone-numbers-module list --where.<field>.<op> <value> --orderBy <values>
csdk phone-numbers-module list --limit 10 --after <cursor>
csdk phone-numbers-module find-first --where.<field>.<op> <value>
csdk phone-numbers-module get --id <UUID>
csdk phone-numbers-module create --databaseId <UUID> --tableName <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>]
csdk phone-numbers-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>]
csdk phone-numbers-module delete --id <UUID>
```

## Examples

### List phoneNumbersModule records

```bash
csdk phone-numbers-module list
```

### List phoneNumbersModule records with pagination

```bash
csdk phone-numbers-module list --limit 10 --offset 0
```

### List phoneNumbersModule records with cursor pagination

```bash
csdk phone-numbers-module list --limit 10 --after <cursor>
```

### Find first matching phoneNumbersModule

```bash
csdk phone-numbers-module find-first --where.id.equalTo <value>
```

### List phoneNumbersModule records with field selection

```bash
csdk phone-numbers-module list --select id,id
```

### List phoneNumbersModule records with filtering and ordering

```bash
csdk phone-numbers-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a phoneNumbersModule

```bash
csdk phone-numbers-module create --databaseId <UUID> --tableName <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>]
```

### Get a phoneNumbersModule by id

```bash
csdk phone-numbers-module get --id <value>
```
