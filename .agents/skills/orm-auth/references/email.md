# email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

User email addresses with verification and primary-email management

## Usage

```typescript
db.email.findMany({ select: { id: true } }).execute()
db.email.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.email.create({ data: { ownerId: '<UUID>', email: '<Email>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' }, select: { id: true } }).execute()
db.email.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.email.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all email records

```typescript
const items = await db.email.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a email

```typescript
const item = await db.email.create({
  data: { ownerId: '<UUID>', email: '<Email>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' },
  select: { id: true }
}).execute();
```
