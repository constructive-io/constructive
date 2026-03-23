# membershipType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member)

## Usage

```typescript
db.membershipType.findMany({ select: { id: true } }).execute()
db.membershipType.findOne({ id: '<Int>', select: { id: true } }).execute()
db.membershipType.create({ data: { name: '<String>', description: '<String>', prefix: '<String>' }, select: { id: true } }).execute()
db.membershipType.update({ where: { id: '<Int>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.membershipType.delete({ where: { id: '<Int>' } }).execute()
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
  data: { name: '<String>', description: '<String>', prefix: '<String>' },
  select: { id: true }
}).execute();
```
