# userConnectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UserConnectedAccount records

## Usage

```typescript
db.userConnectedAccount.findMany({ select: { id: true } }).execute()
db.userConnectedAccount.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userConnectedAccount.create({ data: { ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' }, select: { id: true } }).execute()
db.userConnectedAccount.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.userConnectedAccount.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userConnectedAccount records

```typescript
const items = await db.userConnectedAccount.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a userConnectedAccount

```typescript
const item = await db.userConnectedAccount.create({
  data: { ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' },
  select: { id: true }
}).execute();
```
