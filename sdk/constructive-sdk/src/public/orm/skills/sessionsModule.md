# orm-sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SessionsModule records

## Usage

```typescript
db.sessionsModule.findMany({ select: { id: true } }).execute()
db.sessionsModule.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.sessionsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', authSettingsTableId: '<value>', usersTableId: '<value>', sessionsDefaultExpiration: '<value>', sessionsTable: '<value>', sessionCredentialsTable: '<value>', authSettingsTable: '<value>' }, select: { id: true } }).execute()
db.sessionsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.sessionsModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', sessionsTableId: 'value', sessionCredentialsTableId: 'value', authSettingsTableId: 'value', usersTableId: 'value', sessionsDefaultExpiration: 'value', sessionsTable: 'value', sessionCredentialsTable: 'value', authSettingsTable: 'value' },
  select: { id: true }
}).execute();
```
