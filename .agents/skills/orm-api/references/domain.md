# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Fully-qualified hostnames owned by this scope; each row claims its hostname globally through the catalog

## Usage

```typescript
db.domain.findMany({ select: { id: true } }).execute()
db.domain.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.domain.create({ data: { config: '<JSON>', databaseId: '<UUID>', hostname: '<String>', isPublished: '<Boolean>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsReadyAt: '<Datetime>', tlsSecretName: '<String>', tlsStatus: '<String>', verificationStatus: '<String>', verifiedAt: '<Datetime>' }, select: { id: true } }).execute()
db.domain.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.domain.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all domain records

```typescript
const items = await db.domain.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a domain

```typescript
const item = await db.domain.create({
  data: { config: '<JSON>', databaseId: '<UUID>', hostname: '<String>', isPublished: '<Boolean>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsReadyAt: '<Datetime>', tlsSecretName: '<String>', tlsStatus: '<String>', verificationStatus: '<String>', verifiedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
