# internalSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage.

## Usage

```typescript
db.internalSecretsModule.findMany({ select: { id: true } }).execute()
db.internalSecretsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.internalSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityField: '<String>', policies: '<JSON>', provisions: '<JSON>' }, select: { id: true } }).execute()
db.internalSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.internalSecretsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all internalSecretsModule records

```typescript
const items = await db.internalSecretsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a internalSecretsModule

```typescript
const item = await db.internalSecretsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityField: '<String>', policies: '<JSON>', provisions: '<JSON>' },
  select: { id: true }
}).execute();
```
