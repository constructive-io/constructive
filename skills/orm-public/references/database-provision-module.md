# databaseProvisionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated.

## Usage

```typescript
db.databaseProvisionModule.findMany({ select: { id: true } }).execute()
db.databaseProvisionModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.databaseProvisionModule.create({ data: { databaseName: '<value>', ownerId: '<value>', subdomain: '<value>', domain: '<value>', modules: '<value>', options: '<value>', bootstrapUser: '<value>', status: '<value>', errorMessage: '<value>', databaseId: '<value>', completedAt: '<value>' }, select: { id: true } }).execute()
db.databaseProvisionModule.update({ where: { id: '<value>' }, data: { databaseName: '<new>' }, select: { id: true } }).execute()
db.databaseProvisionModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all databaseProvisionModule records

```typescript
const items = await db.databaseProvisionModule.findMany({
  select: { id: true, databaseName: true }
}).execute();
```

### Create a databaseProvisionModule

```typescript
const item = await db.databaseProvisionModule.create({
  data: { databaseName: 'value', ownerId: 'value', subdomain: 'value', domain: 'value', modules: 'value', options: 'value', bootstrapUser: 'value', status: 'value', errorMessage: 'value', databaseId: 'value', completedAt: 'value' },
  select: { id: true }
}).execute();
```
