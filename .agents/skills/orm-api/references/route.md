# route

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Routes binding a domain hostname and path to a typed catalog target

## Usage

```typescript
db.route.findMany({ select: { id: true } }).execute()
db.route.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.route.create({ data: { config: '<JSON>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetApiId: '<UUID>', targetBucketId: '<UUID>', targetFunctionId: '<UUID>', targetServiceId: '<UUID>', targetSiteId: '<UUID>' }, select: { id: true } }).execute()
db.route.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.route.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all route records

```typescript
const items = await db.route.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a route

```typescript
const item = await db.route.create({
  data: { config: '<JSON>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetApiId: '<UUID>', targetBucketId: '<UUID>', targetFunctionId: '<UUID>', targetServiceId: '<UUID>', targetSiteId: '<UUID>' },
  select: { id: true }
}).execute();
```
