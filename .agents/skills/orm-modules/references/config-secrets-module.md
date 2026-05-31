# configSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Entity-aware PGP-encrypted key-value config/secrets module. Supports app-level (admin-only)
     and org-scoped (per-org secrets with manage_secrets permission) via the scope column.
     User-scoped bcrypt credentials are handled by user_credentials_module.

## Usage

```typescript
db.configSecretsModule.findMany({ select: { id: true } }).execute()
db.configSecretsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.configSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', configDefinitionsTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', databaseOwned: '<Boolean>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', hasConfig: '<Boolean>' }, select: { id: true } }).execute()
db.configSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.configSecretsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all configSecretsModule records

```typescript
const items = await db.configSecretsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a configSecretsModule

```typescript
const item = await db.configSecretsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', configDefinitionsTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', databaseOwned: '<Boolean>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', hasConfig: '<Boolean>' },
  select: { id: true }
}).execute();
```
