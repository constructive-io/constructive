# userConnectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UserConnectedAccount records

## Usage

```typescript
db.userConnectedAccount.findMany({ select: { id: true } }).execute()
db.userConnectedAccount.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userConnectedAccount.update({ where: { id: '<UUID>' }, data: { details: '<JSON>' }, select: { id: true } }).execute()
db.userConnectedAccount.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userConnectedAccount records

```typescript
const items = await db.userConnectedAccount.findMany({
  select: { id: true, details: true }
}).execute();
```
