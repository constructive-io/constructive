# plansModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlansModule records via csdk CLI

## Usage

```bash
csdk plans-module list
csdk plans-module list --where.<field>.<op> <value> --orderBy <values>
csdk plans-module list --limit 10 --after <cursor>
csdk plans-module find-first --where.<field>.<op> <value>
csdk plans-module get --id <UUID>
csdk plans-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--plansTableId <UUID>] [--plansTableName <String>] [--planLimitsTableId <UUID>] [--planLimitsTableName <String>] [--planPricingTableId <UUID>] [--planOverridesTableId <UUID>] [--planMeterLimitsTableId <UUID>] [--planCapsTableId <UUID>] [--applyPlanFunction <String>] [--applyPlanAggregateFunction <String>] [--applyBillingPlanFunction <String>] [--applyPlanCapsFunction <String>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
csdk plans-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--plansTableId <UUID>] [--plansTableName <String>] [--planLimitsTableId <UUID>] [--planLimitsTableName <String>] [--planPricingTableId <UUID>] [--planOverridesTableId <UUID>] [--planMeterLimitsTableId <UUID>] [--planCapsTableId <UUID>] [--applyPlanFunction <String>] [--applyPlanAggregateFunction <String>] [--applyBillingPlanFunction <String>] [--applyPlanCapsFunction <String>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
csdk plans-module delete --id <UUID>
```

## Examples

### List plansModule records

```bash
csdk plans-module list
```

### List plansModule records with pagination

```bash
csdk plans-module list --limit 10 --offset 0
```

### List plansModule records with cursor pagination

```bash
csdk plans-module list --limit 10 --after <cursor>
```

### Find first matching plansModule

```bash
csdk plans-module find-first --where.id.equalTo <value>
```

### List plansModule records with field selection

```bash
csdk plans-module list --select id,id
```

### List plansModule records with filtering and ordering

```bash
csdk plans-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a plansModule

```bash
csdk plans-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--plansTableId <UUID>] [--plansTableName <String>] [--planLimitsTableId <UUID>] [--planLimitsTableName <String>] [--planPricingTableId <UUID>] [--planOverridesTableId <UUID>] [--planMeterLimitsTableId <UUID>] [--planCapsTableId <UUID>] [--applyPlanFunction <String>] [--applyPlanAggregateFunction <String>] [--applyBillingPlanFunction <String>] [--applyPlanCapsFunction <String>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
```

### Get a plansModule by id

```bash
csdk plans-module get --id <value>
```
