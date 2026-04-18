# sessionSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users.

## Usage

```typescript
db.sessionSecretsModule.findMany({ select: { id: true } }).execute()
db.sessionSecretsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.sessionSecretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', sessionsTableId: '<UUID>' }, select: { id: true } }).execute()
db.sessionSecretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.sessionSecretsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all sessionSecretsModule records

```typescript
const items = await db.sessionSecretsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a sessionSecretsModule

```typescript
const item = await db.sessionSecretsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', sessionsTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
