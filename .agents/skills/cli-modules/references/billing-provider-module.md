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
csdk billing-provider-module create --databaseId <UUID> [--apiName <String>] [--billingCustomersTableId <UUID>] [--billingCustomersTableName <String>] [--billingPricesTableId <UUID>] [--billingPricesTableName <String>] [--billingProductsTableId <UUID>] [--billingProductsTableName <String>] [--billingSubscriptionsTableId <UUID>] [--billingSubscriptionsTableName <String>] [--billingWebhookEventsTableId <UUID>] [--billingWebhookEventsTableName <String>] [--prefix <String>] [--pricesTableId <UUID>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--processBillingEventFunction <String>] [--productsTableId <UUID>] [--provider <String>] [--schemaId <UUID>] [--subscriptionsTableId <UUID>]
csdk billing-provider-module update --id <UUID> [--apiName <String>] [--billingCustomersTableId <UUID>] [--billingCustomersTableName <String>] [--billingPricesTableId <UUID>] [--billingPricesTableName <String>] [--billingProductsTableId <UUID>] [--billingProductsTableName <String>] [--billingSubscriptionsTableId <UUID>] [--billingSubscriptionsTableName <String>] [--billingWebhookEventsTableId <UUID>] [--billingWebhookEventsTableName <String>] [--databaseId <UUID>] [--prefix <String>] [--pricesTableId <UUID>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--processBillingEventFunction <String>] [--productsTableId <UUID>] [--provider <String>] [--schemaId <UUID>] [--subscriptionsTableId <UUID>]
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
csdk billing-provider-module create --databaseId <UUID> [--apiName <String>] [--billingCustomersTableId <UUID>] [--billingCustomersTableName <String>] [--billingPricesTableId <UUID>] [--billingPricesTableName <String>] [--billingProductsTableId <UUID>] [--billingProductsTableName <String>] [--billingSubscriptionsTableId <UUID>] [--billingSubscriptionsTableName <String>] [--billingWebhookEventsTableId <UUID>] [--billingWebhookEventsTableName <String>] [--prefix <String>] [--pricesTableId <UUID>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--processBillingEventFunction <String>] [--productsTableId <UUID>] [--provider <String>] [--schemaId <UUID>] [--subscriptionsTableId <UUID>]
```

### Get a billingProviderModule by id

```bash
csdk billing-provider-module get --id <value>
```
