# orm-email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Email records

## Usage

```typescript
db.email.findMany({ select: { id: true } }).execute()
db.email.findOne({ id: '<value>', select: { id: true } }).execute()
db.email.create({ data: { ownerId: '<value>', email: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute()
db.email.update({ where: { id: '<value>' }, data: { ownerId: '<new>' }, select: { id: true } }).execute()
db.email.delete({ where: { id: '<value>' } }).execute()
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
  data: { ownerId: 'value', email: 'value', isVerified: 'value', isPrimary: 'value' },
  select: { id: true }
}).execute();
```
