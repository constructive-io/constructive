# principalAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions credentials for principals on top of principals_module: API keys, child sessions, delegation and token exchange, and org API key management. Requires the built-in auth stack (sessions_module, user_auth_module); installing it provisions principals_module first when the database does not have it. Org API key functions are only generated when an org-scoped memberships_module exists for the database.

## Usage

```typescript
db.principalAuthModule.findMany({ select: { id: true } }).execute()
db.principalAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalAuthModule.create({ data: { apiName: '<String>', auditsTableId: '<UUID>', createOrgApiKeyFunction: '<String>', createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', privateSchemaId: '<UUID>', revokeOrgApiKeyFunction: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sweepExpiredPrincipalsFunction: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
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
  data: { apiName: '<String>', auditsTableId: '<UUID>', createOrgApiKeyFunction: '<String>', createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', privateSchemaId: '<UUID>', revokeOrgApiKeyFunction: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sweepExpiredPrincipalsFunction: '<String>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
