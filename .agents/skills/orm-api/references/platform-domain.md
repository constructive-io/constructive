# platformDomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Fully-qualified hostnames owned by this scope; each row claims its hostname globally through the catalog

## Usage

```typescript
db.platformDomain.findMany({ select: { id: true } }).execute()
db.platformDomain.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformDomain.create({ data: { config: '<JSON>', createdByPrincipal: '<UUID>', hostname: '<String>', isPublished: '<Boolean>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsReadyAt: '<Datetime>', tlsSecretName: '<String>', tlsStatus: '<String>', updatedByPrincipal: '<UUID>', verificationStatus: '<String>', verifiedAt: '<Datetime>' }, select: { id: true } }).execute()
db.platformDomain.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.platformDomain.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformDomain records

```typescript
const items = await db.platformDomain.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a platformDomain

```typescript
const item = await db.platformDomain.create({
  data: { config: '<JSON>', createdByPrincipal: '<UUID>', hostname: '<String>', isPublished: '<Boolean>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsReadyAt: '<Datetime>', tlsSecretName: '<String>', tlsStatus: '<String>', updatedByPrincipal: '<UUID>', verificationStatus: '<String>', verifiedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
