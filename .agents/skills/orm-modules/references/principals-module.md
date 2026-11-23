# principalsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions principals as authorization data, with no dependency on sessions or sign-in: the principals, principal_entities and principal_scope_overrides tables, the create/update/delete and scope mutations, the SPRT derivation that keeps a principal's capabilities in step with its owner, and the expiry sweep. The caller that opens the transaction sets jwt.claims.principal_id to a principal's user_id. Credentials for principals (API keys, child sessions, token exchange) are principal_auth_module, which builds on this one.

## Usage

```typescript
db.principalsModule.findMany({ select: { id: true } }).execute()
db.principalsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalsModule.create({ data: { createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', sweepExpiredPrincipalsFunction: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.principalsModule.update({ where: { id: '<UUID>' }, data: { createOrgPrincipalFunction: '<String>' }, select: { id: true } }).execute()
db.principalsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all principalsModule records

```typescript
const items = await db.principalsModule.findMany({
  select: { id: true, createOrgPrincipalFunction: true }
}).execute();
```

### Create a principalsModule

```typescript
const item = await db.principalsModule.create({
  data: { createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', sweepExpiredPrincipalsFunction: '<String>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
