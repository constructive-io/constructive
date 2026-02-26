# orm-phoneNumber

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PhoneNumber records

## Usage

```typescript
db.phoneNumber.findMany({ select: { id: true } }).execute()
db.phoneNumber.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.phoneNumber.create({ data: { ownerId: '<value>', cc: '<value>', number: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute()
db.phoneNumber.update({ where: { id: '<value>' }, data: { ownerId: '<new>' }, select: { id: true } }).execute()
db.phoneNumber.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all phoneNumber records

```typescript
const items = await db.phoneNumber.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a phoneNumber

```typescript
const item = await db.phoneNumber.create({
  data: { ownerId: 'value', cc: 'value', number: 'value', isVerified: 'value', isPrimary: 'value' },
  select: { id: true }
}).execute();
```
