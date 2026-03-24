# connectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

OAuth and social login connections linking external service accounts to users

## Usage

```typescript
db.connectedAccount.findMany({ select: { id: true } }).execute()
db.connectedAccount.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.connectedAccount.create({ data: { ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' }, select: { id: true } }).execute()
db.connectedAccount.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.connectedAccount.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all connectedAccount records

```typescript
const items = await db.connectedAccount.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a connectedAccount

```typescript
const item = await db.connectedAccount.create({
  data: { ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' },
  select: { id: true }
}).execute();
```
