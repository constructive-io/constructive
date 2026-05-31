---
name: orm-api
description: ORM client for the api API — provides typed CRUD operations for 45 tables and 10 custom operations
---

# orm-api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the api API — provides typed CRUD operations for 45 tables and 10 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: function, schema, table, checkConstraint, field, spatialRelation, foreignKeyConstraint, fullTextSearch, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.function.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [function](references/function.md)
- [schema](references/schema.md)
- [table](references/table.md)
- [check-constraint](references/check-constraint.md)
- [field](references/field.md)
- [spatial-relation](references/spatial-relation.md)
- [foreign-key-constraint](references/foreign-key-constraint.md)
- [full-text-search](references/full-text-search.md)
- [index](references/index.md)
- [policy](references/policy.md)
- [primary-key-constraint](references/primary-key-constraint.md)
- [table-grant](references/table-grant.md)
- [trigger](references/trigger.md)
- [unique-constraint](references/unique-constraint.md)
- [view](references/view.md)
- [view-table](references/view-table.md)
- [view-grant](references/view-grant.md)
- [view-rule](references/view-rule.md)
- [embedding-chunk](references/embedding-chunk.md)
- [schema-grant](references/schema-grant.md)
- [default-privilege](references/default-privilege.md)
- [enum](references/enum.md)
- [api-schema](references/api-schema.md)
- [api-module](references/api-module.md)
- [domain](references/domain.md)
- [site-metadatum](references/site-metadatum.md)
- [site-module](references/site-module.md)
- [site-theme](references/site-theme.md)
- [cors-setting](references/cors-setting.md)
- [trigger-function](references/trigger-function.md)
- [partition](references/partition.md)
- [database-transfer](references/database-transfer.md)
- [api](references/api.md)
- [site](references/site.md)
- [app](references/app.md)
- [api-setting](references/api-setting.md)
- [migrate-file](references/migrate-file.md)
- [node-type-registry](references/node-type-registry.md)
- [pubkey-setting](references/pubkey-setting.md)
- [database](references/database.md)
- [rls-setting](references/rls-setting.md)
- [sql-action](references/sql-action.md)
- [database-setting](references/database-setting.md)
- [webauthn-setting](references/webauthn-setting.md)
- [ast-migration](references/ast-migration.md)
- [apply-registry-defaults](references/apply-registry-defaults.md)
- [accept-database-transfer](references/accept-database-transfer.md)
- [cancel-database-transfer](references/cancel-database-transfer.md)
- [reject-database-transfer](references/reject-database-transfer.md)
- [provision-database-with-user](references/provision-database-with-user.md)
- [bootstrap-user](references/bootstrap-user.md)
- [set-field-order](references/set-field-order.md)
- [apply-rls](references/apply-rls.md)
- [create-user-database](references/create-user-database.md)
- [provision-bucket](references/provision-bucket.md)
