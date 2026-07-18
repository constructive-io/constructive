# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SessionsModule records

## Usage

```typescript
db.sessionsModule.findMany({ select: { id: true } }).execute()
db.sessionsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.sessionsModule.create({ data: { authSettingsTableId: '<UUID>', authSettingsTableName: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionCredentialsTableName: '<String>', sessionsDefaultExpiration: '<Interval>', sessionsTableId: '<UUID>', sessionsTableName: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.sessionsModule.update({ where: { id: '<UUID>' }, data: { authSettingsTableId: '<UUID>' }, select: { id: true } }).execute()
db.sessionsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all sessionsModule records

```typescript
const items = await db.sessionsModule.findMany({
  select: { id: true, authSettingsTableId: true }
}).execute();
```

### Create a sessionsModule

```typescript
const item = await db.sessionsModule.create({
  data: { authSettingsTableId: '<UUID>', authSettingsTableName: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionCredentialsTableName: '<String>', sessionsDefaultExpiration: '<Interval>', sessionsTableId: '<UUID>', sessionsTableName: '<String>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
