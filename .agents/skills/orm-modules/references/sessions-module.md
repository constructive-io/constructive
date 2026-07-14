# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SessionsModule records

## Usage

```typescript
db.sessionsModule.findMany({ select: { id: true } }).execute()
db.sessionsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.sessionsModule.create({ data: { authSettingsTable: '<String>', authSettingsTableId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTable: '<String>', sessionCredentialsTableId: '<UUID>', sessionsDefaultExpiration: '<Interval>', sessionsTable: '<String>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.sessionsModule.update({ where: { id: '<UUID>' }, data: { authSettingsTable: '<String>' }, select: { id: true } }).execute()
db.sessionsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all sessionsModule records

```typescript
const items = await db.sessionsModule.findMany({
  select: { id: true, authSettingsTable: true }
}).execute();
```

### Create a sessionsModule

```typescript
const item = await db.sessionsModule.create({
  data: { authSettingsTable: '<String>', authSettingsTableId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTable: '<String>', sessionCredentialsTableId: '<UUID>', sessionsDefaultExpiration: '<Interval>', sessionsTable: '<String>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
