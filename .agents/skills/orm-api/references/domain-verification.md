# domainVerification

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One row per outstanding/completed ownership-verification challenge for a managed_domain. Holds the PUBLIC challenge the user must publish (e.g. a DNS TXT record value) — this is a verification token, NOT a secret. Entity-owned via owner_id and read/written through the AuthzEntityMembership scoped-module security path gated on manage_domains.

## Usage

```typescript
db.domainVerification.findMany({ select: { id: true } }).execute()
db.domainVerification.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.domainVerification.create({ data: { attempts: '<Int>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', ownerId: '<UUID>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' }, select: { id: true } }).execute()
db.domainVerification.update({ where: { id: '<UUID>' }, data: { attempts: '<Int>' }, select: { id: true } }).execute()
db.domainVerification.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all domainVerification records

```typescript
const items = await db.domainVerification.findMany({
  select: { id: true, attempts: true }
}).execute();
```

### Create a domainVerification

```typescript
const item = await db.domainVerification.create({
  data: { attempts: '<Int>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', ownerId: '<UUID>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
