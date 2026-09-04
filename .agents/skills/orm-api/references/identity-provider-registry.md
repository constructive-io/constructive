# identityProviderRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for IdentityProviderRegistry records

## Usage

```typescript
db.identityProviderRegistry.findMany({ select: { id: true } }).execute()
db.identityProviderRegistry.findOne({ slug: '<String>', select: { id: true } }).execute()
db.identityProviderRegistry.create({ data: { authorizationUrl: '<String>', displayName: '<String>', issuerUrl: '<String>', kind: '<String>', scopes: '<String>', tokenUrl: '<String>', userinfoUrl: '<String>' }, select: { id: true } }).execute()
db.identityProviderRegistry.update({ where: { slug: '<String>' }, data: { authorizationUrl: '<String>' }, select: { id: true } }).execute()
db.identityProviderRegistry.delete({ where: { slug: '<String>' } }).execute()
```

## Examples

### List all identityProviderRegistry records

```typescript
const items = await db.identityProviderRegistry.findMany({
  select: { slug: true, authorizationUrl: true }
}).execute();
```

### Create a identityProviderRegistry

```typescript
const item = await db.identityProviderRegistry.create({
  data: { authorizationUrl: '<String>', displayName: '<String>', issuerUrl: '<String>', kind: '<String>', scopes: '<String>', tokenUrl: '<String>', userinfoUrl: '<String>' },
  select: { slug: true }
}).execute();
```
