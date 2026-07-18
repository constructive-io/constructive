# rlsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RlsModule records

## Usage

```typescript
db.rlsModule.findMany({ select: { id: true } }).execute()
db.rlsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.rlsModule.create({ data: { apiName: '<String>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.rlsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.rlsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all rlsModule records

```typescript
const items = await db.rlsModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a rlsModule

```typescript
const item = await db.rlsModule.create({
  data: { apiName: '<String>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
