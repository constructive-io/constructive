# phoneNumber

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

User phone numbers with country code, verification, and primary-number management

## Usage

```typescript
db.phoneNumber.findMany({ select: { id: true } }).execute()
db.phoneNumber.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.phoneNumber.create({ data: { cc: '<String>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', number: '<String>', ownerId: '<UUID>' }, select: { id: true } }).execute()
db.phoneNumber.update({ where: { id: '<UUID>' }, data: { cc: '<String>' }, select: { id: true } }).execute()
db.phoneNumber.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all phoneNumber records

```typescript
const items = await db.phoneNumber.findMany({
  select: { id: true, cc: true }
}).execute();
```

### Create a phoneNumber

```typescript
const item = await db.phoneNumber.create({
  data: { cc: '<String>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', number: '<String>', ownerId: '<UUID>' },
  select: { id: true }
}).execute();
```
