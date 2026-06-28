# principalAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database.

## Usage

```typescript
db.principalAuthModule.findMany({ select: { id: true } }).execute()
db.principalAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalAuthModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', principalsTableId: '<UUID>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', usersTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', principalsTableName: '<String>', createPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', createOrgPrincipalFunction: '<String>', deleteOrgPrincipalFunction: '<String>', createOrgApiKeyFunction: '<String>', revokeOrgApiKeyFunction: '<String>', apiName: '<String>' }, select: { id: true } }).execute()
db.principalAuthModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.principalAuthModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all principalAuthModule records

```typescript
const items = await db.principalAuthModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a principalAuthModule

```typescript
const item = await db.principalAuthModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', principalsTableId: '<UUID>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', usersTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', principalsTableName: '<String>', createPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', createOrgPrincipalFunction: '<String>', deleteOrgPrincipalFunction: '<String>', createOrgApiKeyFunction: '<String>', revokeOrgApiKeyFunction: '<String>', apiName: '<String>' },
  select: { id: true }
}).execute();
```
