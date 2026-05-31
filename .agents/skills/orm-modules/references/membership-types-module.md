# membershipTypesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MembershipTypesModule records

## Usage

```typescript
db.membershipTypesModule.findMany({ select: { id: true } }).execute()
db.membershipTypesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.membershipTypesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.membershipTypesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.membershipTypesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all membershipTypesModule records

```typescript
const items = await db.membershipTypesModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a membershipTypesModule

```typescript
const item = await db.membershipTypesModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
