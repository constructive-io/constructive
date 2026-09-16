# routeBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Compiled route precedence index maintained by route sync triggers; carries typed target ids only, read through the resolver

## Usage

```typescript
db.routeBinding.findMany({ select: { id: true } }).execute()
db.routeBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.routeBinding.create({ data: { domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetApiId: '<UUID>', targetBucketId: '<UUID>', targetFunctionId: '<UUID>', targetRedirectId: '<UUID>', targetServiceId: '<UUID>', targetSiteId: '<UUID>' }, select: { id: true } }).execute()
db.routeBinding.update({ where: { id: '<UUID>' }, data: { domainId: '<UUID>' }, select: { id: true } }).execute()
db.routeBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all routeBinding records

```typescript
const items = await db.routeBinding.findMany({
  select: { id: true, domainId: true }
}).execute();
```

### Create a routeBinding

```typescript
const item = await db.routeBinding.create({
  data: { domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetApiId: '<UUID>', targetBucketId: '<UUID>', targetFunctionId: '<UUID>', targetRedirectId: '<UUID>', targetServiceId: '<UUID>', targetSiteId: '<UUID>' },
  select: { id: true }
}).execute();
```
