# emailSiteIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a site to the identity it sends as. Unique on site_id: one identity per site, but many sites may share an identity.

## Usage

```typescript
db.emailSiteIdentity.findMany({ select: { id: true } }).execute()
db.emailSiteIdentity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.emailSiteIdentity.create({ data: { databaseId: '<UUID>', emailIdentityId: '<UUID>', siteId: '<UUID>' }, select: { id: true } }).execute()
db.emailSiteIdentity.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.emailSiteIdentity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all emailSiteIdentity records

```typescript
const items = await db.emailSiteIdentity.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a emailSiteIdentity

```typescript
const item = await db.emailSiteIdentity.create({
  data: { databaseId: '<UUID>', emailIdentityId: '<UUID>', siteId: '<UUID>' },
  select: { id: true }
}).execute();
```
