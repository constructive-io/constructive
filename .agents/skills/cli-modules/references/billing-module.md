# billingModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for BillingModule records via csdk CLI

## Usage

```bash
csdk billing-module list
csdk billing-module list --where.<field>.<op> <value> --orderBy <values>
csdk billing-module list --limit 10 --after <cursor>
csdk billing-module find-first --where.<field>.<op> <value>
csdk billing-module get --id <UUID>
csdk billing-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--metersTableId <UUID>] [--metersTableName <String>] [--planSubscriptionsTableId <UUID>] [--planSubscriptionsTableName <String>] [--ledgerTableId <UUID>] [--ledgerTableName <String>] [--balancesTableId <UUID>] [--balancesTableName <String>] [--meterCreditsTableId <UUID>] [--meterCreditsTableName <String>] [--meterSourcesTableId <UUID>] [--meterSourcesTableName <String>] [--meterDefaultsTableId <UUID>] [--meterDefaultsTableName <String>] [--recordUsageFunction <String>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
csdk billing-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--metersTableId <UUID>] [--metersTableName <String>] [--planSubscriptionsTableId <UUID>] [--planSubscriptionsTableName <String>] [--ledgerTableId <UUID>] [--ledgerTableName <String>] [--balancesTableId <UUID>] [--balancesTableName <String>] [--meterCreditsTableId <UUID>] [--meterCreditsTableName <String>] [--meterSourcesTableId <UUID>] [--meterSourcesTableName <String>] [--meterDefaultsTableId <UUID>] [--meterDefaultsTableName <String>] [--recordUsageFunction <String>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
csdk billing-module delete --id <UUID>
```

## Examples

### List billingModule records

```bash
csdk billing-module list
```

### List billingModule records with pagination

```bash
csdk billing-module list --limit 10 --offset 0
```

### List billingModule records with cursor pagination

```bash
csdk billing-module list --limit 10 --after <cursor>
```

### Find first matching billingModule

```bash
csdk billing-module find-first --where.id.equalTo <value>
```

### List billingModule records with field selection

```bash
csdk billing-module list --select id,id
```

### List billingModule records with filtering and ordering

```bash
csdk billing-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a billingModule

```bash
csdk billing-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--metersTableId <UUID>] [--metersTableName <String>] [--planSubscriptionsTableId <UUID>] [--planSubscriptionsTableName <String>] [--ledgerTableId <UUID>] [--ledgerTableName <String>] [--balancesTableId <UUID>] [--balancesTableName <String>] [--meterCreditsTableId <UUID>] [--meterCreditsTableName <String>] [--meterSourcesTableId <UUID>] [--meterSourcesTableName <String>] [--meterDefaultsTableId <UUID>] [--meterDefaultsTableName <String>] [--recordUsageFunction <String>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
```

### Get a billingModule by id

```bash
csdk billing-module get --id <value>
```
