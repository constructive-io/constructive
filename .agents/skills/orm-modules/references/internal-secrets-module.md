# internalSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage.

## Usage

```typescript
db.internalSecretsModule.findMany({ select: { id: true } }).execute()
db.internalSecretsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.internalSecretsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.internalSecretsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.internalSecretsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all internalSecretsModule records

```typescript
const items = await db.internalSecretsModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a internalSecretsModule

```typescript
const item = await db.internalSecretsModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
