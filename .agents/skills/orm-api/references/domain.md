# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site

## Usage

```typescript
db.domain.findMany({ select: { id: true } }).execute()
db.domain.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.domain.create({ data: { annotations: '<JSON>', apiId: '<UUID>', databaseId: '<UUID>', domain: '<Hostname>', labels: '<JSON>', serviceId: '<UUID>', siteId: '<UUID>', subdomain: '<Hostname>' }, select: { id: true } }).execute()
db.domain.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.domain.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all domain records

```typescript
const items = await db.domain.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a domain

```typescript
const item = await db.domain.create({
  data: { annotations: '<JSON>', apiId: '<UUID>', databaseId: '<UUID>', domain: '<Hostname>', labels: '<JSON>', serviceId: '<UUID>', siteId: '<UUID>', subdomain: '<Hostname>' },
  select: { id: true }
}).execute();
```
