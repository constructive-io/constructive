# databaseProvisionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseProvisionModule records via csdk CLI

## Usage

```bash
csdk database-provision-module list
csdk database-provision-module list --where.<field>.<op> <value> --orderBy <values>
csdk database-provision-module list --limit 10 --after <cursor>
csdk database-provision-module find-first --where.<field>.<op> <value>
csdk database-provision-module get --id <UUID>
csdk database-provision-module create --databaseName <String> --ownerId <UUID> --domain <String> [--subdomain <String>] [--modules <String>] [--options <JSON>] [--bootstrapUser <Boolean>] [--status <String>] [--errorMessage <String>] [--databaseId <UUID>] [--completedAt <Datetime>]
csdk database-provision-module update --id <UUID> [--databaseName <String>] [--ownerId <UUID>] [--subdomain <String>] [--domain <String>] [--modules <String>] [--options <JSON>] [--bootstrapUser <Boolean>] [--status <String>] [--errorMessage <String>] [--databaseId <UUID>] [--completedAt <Datetime>]
csdk database-provision-module delete --id <UUID>
```

## Examples

### List databaseProvisionModule records

```bash
csdk database-provision-module list
```

### List databaseProvisionModule records with pagination

```bash
csdk database-provision-module list --limit 10 --offset 0
```

### List databaseProvisionModule records with cursor pagination

```bash
csdk database-provision-module list --limit 10 --after <cursor>
```

### Find first matching databaseProvisionModule

```bash
csdk database-provision-module find-first --where.id.equalTo <value>
```

### List databaseProvisionModule records with field selection

```bash
csdk database-provision-module list --select id,id
```

### List databaseProvisionModule records with filtering and ordering

```bash
csdk database-provision-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseProvisionModule

```bash
csdk database-provision-module create --databaseName <String> --ownerId <UUID> --domain <String> [--subdomain <String>] [--modules <String>] [--options <JSON>] [--bootstrapUser <Boolean>] [--status <String>] [--errorMessage <String>] [--databaseId <UUID>] [--completedAt <Datetime>]
```

### Get a databaseProvisionModule by id

```bash
csdk database-provision-module get --id <value>
```
