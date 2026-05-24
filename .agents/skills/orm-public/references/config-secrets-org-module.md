# configSecretsOrgModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the config_secrets_org_module, which provisions an organization-scoped encrypted key-value secrets store with manage_secrets permission and entity-membership RLS.

## Usage

```typescript
db.configSecretsOrgModule.findMany({ select: { id: true } }).execute()
db.configSecretsOrgModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.configSecretsOrgModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.configSecretsOrgModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.configSecretsOrgModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all configSecretsOrgModule records

```typescript
const items = await db.configSecretsOrgModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a configSecretsOrgModule

```typescript
const item = await db.configSecretsOrgModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
