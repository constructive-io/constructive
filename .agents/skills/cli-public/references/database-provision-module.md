# databaseProvisionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseProvisionModule records via csdk CLI

## Usage

```bash
csdk database-provision-module list
csdk database-provision-module get --id <UUID>
csdk database-provision-module create --databaseName <String> --ownerId <UUID> --domain <String> [--subdomain <String>] [--modules <String>] [--options <JSON>] [--bootstrapUser <Boolean>] [--status <String>] [--errorMessage <String>] [--databaseId <UUID>] [--completedAt <Datetime>]
csdk database-provision-module update --id <UUID> [--databaseName <String>] [--ownerId <UUID>] [--subdomain <String>] [--domain <String>] [--modules <String>] [--options <JSON>] [--bootstrapUser <Boolean>] [--status <String>] [--errorMessage <String>] [--databaseId <UUID>] [--completedAt <Datetime>]
csdk database-provision-module delete --id <UUID>
```

## Examples

### List all databaseProvisionModule records

```bash
csdk database-provision-module list
```

### Create a databaseProvisionModule

```bash
csdk database-provision-module create --databaseName <String> --ownerId <UUID> --domain <String> [--subdomain <String>] [--modules <String>] [--options <JSON>] [--bootstrapUser <Boolean>] [--status <String>] [--errorMessage <String>] [--databaseId <UUID>] [--completedAt <Datetime>]
```

### Get a databaseProvisionModule by id

```bash
csdk database-provision-module get --id <value>
```
