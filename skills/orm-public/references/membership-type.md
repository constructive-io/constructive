# membershipType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member)

## Usage

```typescript
db.membershipType.findMany({ select: { id: true } }).execute()
db.membershipType.findOne({ id: '<value>', select: { id: true } }).execute()
db.membershipType.create({ data: { name: '<value>', description: '<value>', prefix: '<value>' }, select: { id: true } }).execute()
db.membershipType.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.membershipType.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all membershipType records

```typescript
const items = await db.membershipType.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a membershipType

```typescript
const item = await db.membershipType.create({
  data: { name: 'value', description: 'value', prefix: 'value' },
  select: { id: true }
}).execute();
```
