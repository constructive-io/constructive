# identityProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which internal_secrets_module table the rotate proc targets
     (app_secrets for app scope, platform_secrets for platform scope). When scope = database,
     the secrets table gets a database_id column.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → platform-wide, platform admin manages (generate:constructive)
       scope=database  → per-database infra, carries database_id

## Usage

```typescript
db.identityProvidersModule.findMany({ select: { id: true } }).execute()
db.identityProvidersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.identityProvidersModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.identityProvidersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.identityProvidersModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all identityProvidersModule records

```typescript
const items = await db.identityProvidersModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a identityProvidersModule

```typescript
const item = await db.identityProvidersModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
