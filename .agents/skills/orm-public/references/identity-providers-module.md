# identityProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the identity_providers_module, which provisions a per-database identity_providers config table holding OAuth2 / OIDC (and future SAML) provider definitions: protocol kind, endpoint URLs, encrypted client secret, scopes, audience validation, PKCE, and email-handling flags. Built-in providers (google, github, apple, ...) are seeded as is_built_in=true rows; custom providers use slugs of the form custom:<slug>.

## Usage

```typescript
db.identityProvidersModule.findMany({ select: { id: true } }).execute()
db.identityProvidersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.identityProvidersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
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
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
