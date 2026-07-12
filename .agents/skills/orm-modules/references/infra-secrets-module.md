# infraSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization.

## Usage

```typescript
db.infraSecretsModule.findMany({ select: { id: true } }).execute()
db.infraSecretsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityField: '<String>', policies: '<JSON>', provisions: '<JSON>' }, select: { id: true } }).execute()
db.infraSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.infraSecretsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraSecretsModule records

```typescript
const items = await db.infraSecretsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a infraSecretsModule

```typescript
const item = await db.infraSecretsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityField: '<String>', policies: '<JSON>', provisions: '<JSON>' },
  select: { id: true }
}).execute();
```
