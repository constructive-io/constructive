# infraSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization.

## Usage

```typescript
db.infraSecretsModule.findMany({ select: { id: true } }).execute()
db.infraSecretsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraSecretsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>' }, select: { id: true } }).execute()
db.infraSecretsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.infraSecretsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraSecretsModule records

```typescript
const items = await db.infraSecretsModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a infraSecretsModule

```typescript
const item = await db.infraSecretsModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>' },
  select: { id: true }
}).execute();
```
