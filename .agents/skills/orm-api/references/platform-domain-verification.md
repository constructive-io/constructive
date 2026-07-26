# platformDomainVerification

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ownership verification challenges issued for a domain

## Usage

```typescript
db.platformDomainVerification.findMany({ select: { id: true } }).execute()
db.platformDomainVerification.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformDomainVerification.create({ data: { attempts: '<Int>', domainId: '<UUID>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' }, select: { id: true } }).execute()
db.platformDomainVerification.update({ where: { id: '<UUID>' }, data: { attempts: '<Int>' }, select: { id: true } }).execute()
db.platformDomainVerification.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformDomainVerification records

```typescript
const items = await db.platformDomainVerification.findMany({
  select: { id: true, attempts: true }
}).execute();
```

### Create a platformDomainVerification

```typescript
const item = await db.platformDomainVerification.create({
  data: { attempts: '<Int>', domainId: '<UUID>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
