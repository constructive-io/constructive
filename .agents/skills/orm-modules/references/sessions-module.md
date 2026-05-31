# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SessionsModule records

## Usage

```typescript
db.sessionsModule.findMany({ select: { id: true } }).execute()
db.sessionsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.sessionsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', authSettingsTableId: '<UUID>', usersTableId: '<UUID>', sessionsDefaultExpiration: '<Interval>', sessionsTable: '<String>', sessionCredentialsTable: '<String>', authSettingsTable: '<String>' }, select: { id: true } }).execute()
db.sessionsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.sessionsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all sessionsModule records

```typescript
const items = await db.sessionsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a sessionsModule

```typescript
const item = await db.sessionsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', authSettingsTableId: '<UUID>', usersTableId: '<UUID>', sessionsDefaultExpiration: '<Interval>', sessionsTable: '<String>', sessionCredentialsTable: '<String>', authSettingsTable: '<String>' },
  select: { id: true }
}).execute();
```
