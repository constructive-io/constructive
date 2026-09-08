# route

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Routes binding a domain hostname and path to a typed catalog target

## Usage

```typescript
db.route.findMany({ select: { id: true } }).execute()
db.route.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.route.create({ data: { anonymous: '<Boolean>', config: '<JSON>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', previewRef: '<String>', priority: '<Int>', servingSiteId: '<UUID>', targetApiId: '<UUID>', targetBucketId: '<UUID>', targetFunctionId: '<UUID>', targetRedirectId: '<UUID>', targetServiceId: '<UUID>', targetSiteId: '<UUID>' }, select: { id: true } }).execute()
db.route.update({ where: { id: '<UUID>' }, data: { anonymous: '<Boolean>' }, select: { id: true } }).execute()
db.route.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all route records

```typescript
const items = await db.route.findMany({
  select: { id: true, anonymous: true }
}).execute();
```

### Create a route

```typescript
const item = await db.route.create({
  data: { anonymous: '<Boolean>', config: '<JSON>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', previewRef: '<String>', priority: '<Int>', servingSiteId: '<UUID>', targetApiId: '<UUID>', targetBucketId: '<UUID>', targetFunctionId: '<UUID>', targetRedirectId: '<UUID>', targetServiceId: '<UUID>', targetSiteId: '<UUID>' },
  select: { id: true }
}).execute();
```
