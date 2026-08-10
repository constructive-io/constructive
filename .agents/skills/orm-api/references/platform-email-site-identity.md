# platformEmailSiteIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a site to the identity it sends as. Unique on site_id: one identity per site, but many sites may share an identity.

## Usage

```typescript
db.platformEmailSiteIdentity.findMany({ select: { id: true } }).execute()
db.platformEmailSiteIdentity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformEmailSiteIdentity.create({ data: { emailIdentityId: '<UUID>', siteId: '<UUID>' }, select: { id: true } }).execute()
db.platformEmailSiteIdentity.update({ where: { id: '<UUID>' }, data: { emailIdentityId: '<UUID>' }, select: { id: true } }).execute()
db.platformEmailSiteIdentity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformEmailSiteIdentity records

```typescript
const items = await db.platformEmailSiteIdentity.findMany({
  select: { id: true, emailIdentityId: true }
}).execute();
```

### Create a platformEmailSiteIdentity

```typescript
const item = await db.platformEmailSiteIdentity.create({
  data: { emailIdentityId: '<UUID>', siteId: '<UUID>' },
  select: { id: true }
}).execute();
```
