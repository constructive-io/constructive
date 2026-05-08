# billingProviderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for BillingProviderModule records via csdk CLI

## Usage

```bash
csdk billing-provider-module list
csdk billing-provider-module list --where.<field>.<op> <value> --orderBy <values>
csdk billing-provider-module list --limit 10 --after <cursor>
csdk billing-provider-module find-first --where.<field>.<op> <value>
csdk billing-provider-module get --id <UUID>
csdk billing-provider-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--provider <String>] [--productsTableId <UUID>] [--pricesTableId <UUID>] [--subscriptionsTableId <UUID>] [--billingCustomersTableId <UUID>] [--billingCustomersTableName <String>] [--billingProductsTableId <UUID>] [--billingProductsTableName <String>] [--billingPricesTableId <UUID>] [--billingPricesTableName <String>] [--billingSubscriptionsTableId <UUID>] [--billingSubscriptionsTableName <String>] [--billingWebhookEventsTableId <UUID>] [--billingWebhookEventsTableName <String>] [--processBillingEventFunction <String>] [--prefix <String>]
csdk billing-provider-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--provider <String>] [--productsTableId <UUID>] [--pricesTableId <UUID>] [--subscriptionsTableId <UUID>] [--billingCustomersTableId <UUID>] [--billingCustomersTableName <String>] [--billingProductsTableId <UUID>] [--billingProductsTableName <String>] [--billingPricesTableId <UUID>] [--billingPricesTableName <String>] [--billingSubscriptionsTableId <UUID>] [--billingSubscriptionsTableName <String>] [--billingWebhookEventsTableId <UUID>] [--billingWebhookEventsTableName <String>] [--processBillingEventFunction <String>] [--prefix <String>]
csdk billing-provider-module delete --id <UUID>
```

## Examples

### List billingProviderModule records

```bash
csdk billing-provider-module list
```

### List billingProviderModule records with pagination

```bash
csdk billing-provider-module list --limit 10 --offset 0
```

### List billingProviderModule records with cursor pagination

```bash
csdk billing-provider-module list --limit 10 --after <cursor>
```

### Find first matching billingProviderModule

```bash
csdk billing-provider-module find-first --where.id.equalTo <value>
```

### List billingProviderModule records with field selection

```bash
csdk billing-provider-module list --select id,id
```

### List billingProviderModule records with filtering and ordering

```bash
csdk billing-provider-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a billingProviderModule

```bash
csdk billing-provider-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--provider <String>] [--productsTableId <UUID>] [--pricesTableId <UUID>] [--subscriptionsTableId <UUID>] [--billingCustomersTableId <UUID>] [--billingCustomersTableName <String>] [--billingProductsTableId <UUID>] [--billingProductsTableName <String>] [--billingPricesTableId <UUID>] [--billingPricesTableName <String>] [--billingSubscriptionsTableId <UUID>] [--billingSubscriptionsTableName <String>] [--billingWebhookEventsTableId <UUID>] [--billingWebhookEventsTableName <String>] [--processBillingEventFunction <String>] [--prefix <String>]
```

### Get a billingProviderModule by id

```bash
csdk billing-provider-module get --id <value>
```
