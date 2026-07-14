# email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

User email addresses with verification and primary-email management

## Usage

```typescript
db.email.findMany({ select: { id: true } }).execute()
db.email.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.email.create({ data: { email: '<Email>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', ownerId: '<UUID>' }, select: { id: true } }).execute()
db.email.update({ where: { id: '<UUID>' }, data: { email: '<Email>' }, select: { id: true } }).execute()
db.email.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all email records

```typescript
const items = await db.email.findMany({
  select: { id: true, email: true }
}).execute();
```

### Create a email

```typescript
const item = await db.email.create({
  data: { email: '<Email>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', ownerId: '<UUID>' },
  select: { id: true }
}).execute();
```
