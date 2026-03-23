# databaseProvisionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated.

## Usage

```typescript
db.databaseProvisionModule.findMany({ select: { id: true } }).execute()
db.databaseProvisionModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseProvisionModule.create({ data: { databaseName: '<String>', ownerId: '<UUID>', subdomain: '<String>', domain: '<String>', modules: '<String>', options: '<JSON>', bootstrapUser: '<Boolean>', status: '<String>', errorMessage: '<String>', databaseId: '<UUID>', completedAt: '<Datetime>' }, select: { id: true } }).execute()
db.databaseProvisionModule.update({ where: { id: '<UUID>' }, data: { databaseName: '<String>' }, select: { id: true } }).execute()
db.databaseProvisionModule.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseName: '<String>', ownerId: '<UUID>', subdomain: '<String>', domain: '<String>', modules: '<String>', options: '<JSON>', bootstrapUser: '<Boolean>', status: '<String>', errorMessage: '<String>', databaseId: '<UUID>', completedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
