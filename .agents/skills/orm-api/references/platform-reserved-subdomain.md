# platformReservedSubdomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Subdomain labels no tenant may claim under a platform apex

## Usage

```typescript
db.platformReservedSubdomain.findMany({ select: { id: true } }).execute()
db.platformReservedSubdomain.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformReservedSubdomain.create({ data: { createdByPrincipal: '<UUID>', label: '<String>', match: '<String>', reason: '<String>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformReservedSubdomain.update({ where: { id: '<UUID>' }, data: { createdByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformReservedSubdomain.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformReservedSubdomain records

```typescript
const items = await db.platformReservedSubdomain.findMany({
  select: { id: true, createdByPrincipal: true }
}).execute();
```

### Create a platformReservedSubdomain

```typescript
const item = await db.platformReservedSubdomain.create({
  data: { createdByPrincipal: '<UUID>', label: '<String>', match: '<String>', reason: '<String>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
