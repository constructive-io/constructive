# identityProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for IdentityProvider records

## Usage

```typescript
db.identityProvider.findMany({ select: { id: true } }).execute()
db.identityProvider.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.identityProvider.create({ data: { slug: '<String>', kind: '<String>', displayName: '<String>', enabled: '<Boolean>', isBuiltIn: '<Boolean>' }, select: { id: true } }).execute()
db.identityProvider.update({ where: { id: '<UUID>' }, data: { slug: '<String>' }, select: { id: true } }).execute()
db.identityProvider.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all identityProvider records

```typescript
const items = await db.identityProvider.findMany({
  select: { id: true, slug: true }
}).execute();
```

### Create a identityProvider

```typescript
const item = await db.identityProvider.create({
  data: { slug: '<String>', kind: '<String>', displayName: '<String>', enabled: '<Boolean>', isBuiltIn: '<Boolean>' },
  select: { id: true }
}).execute();
```
