# identityProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which config_secrets_module table the rotate proc targets
     (app_secrets for app scope, org_secrets for org scope). When scope = platform,
     the secrets table gets a database_id column and platform-level RLS via
     AuthzRelatedEntityMembership through database.owner_id.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → per-database, platform admin manages (generate:constructive)
       scope=org       → per-org tenant, org admin manages

## Usage

```typescript
db.identityProvidersModule.findMany({ select: { id: true } }).execute()
db.identityProvidersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.identityProvidersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' }, select: { id: true } }).execute()
db.identityProvidersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.identityProvidersModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all identityProvidersModule records

```typescript
const items = await db.identityProvidersModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a identityProvidersModule

```typescript
const item = await db.identityProvidersModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
