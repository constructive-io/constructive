# managedDomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One row per cert-bearing host or wildcard; tracks domain verification and TLS provisioning independently of services_public.domains. Reconcilers match a route's root domain to a row here by string (no FK/coupling in v1)

## Usage

```typescript
db.managedDomain.findMany({ select: { id: true } }).execute()
db.managedDomain.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.managedDomain.create({ data: { allowPublicUsage: '<Boolean>', annotations: '<JSON>', certStatus: '<String>', databaseId: '<UUID>', domain: '<Hostname>', isWildcard: '<Boolean>', tlsReadyAt: '<Datetime>', tlsStatus: '<String>', verificationStatus: '<String>', verifiedAt: '<Datetime>' }, select: { id: true } }).execute()
db.managedDomain.update({ where: { id: '<UUID>' }, data: { allowPublicUsage: '<Boolean>' }, select: { id: true } }).execute()
db.managedDomain.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all managedDomain records

```typescript
const items = await db.managedDomain.findMany({
  select: { id: true, allowPublicUsage: true }
}).execute();
```

### Create a managedDomain

```typescript
const item = await db.managedDomain.create({
  data: { allowPublicUsage: '<Boolean>', annotations: '<JSON>', certStatus: '<String>', databaseId: '<UUID>', domain: '<Hostname>', isWildcard: '<Boolean>', tlsReadyAt: '<Datetime>', tlsStatus: '<String>', verificationStatus: '<String>', verifiedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
