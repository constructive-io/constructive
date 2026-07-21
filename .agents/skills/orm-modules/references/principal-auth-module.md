# principalAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database.

## Usage

```typescript
db.principalAuthModule.findMany({ select: { id: true } }).execute()
db.principalAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalAuthModule.create({ data: { apiName: '<String>', auditsTableId: '<UUID>', createOrgApiKeyFunction: '<String>', createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', revokeOrgApiKeyFunction: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.principalAuthModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.principalAuthModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all principalAuthModule records

```typescript
const items = await db.principalAuthModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a principalAuthModule

```typescript
const item = await db.principalAuthModule.create({
  data: { apiName: '<String>', auditsTableId: '<UUID>', createOrgApiKeyFunction: '<String>', createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', revokeOrgApiKeyFunction: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
