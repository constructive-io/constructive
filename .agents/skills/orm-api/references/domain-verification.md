# domainVerification

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ownership verification challenges issued for a domain

## Usage

```typescript
db.domainVerification.findMany({ select: { id: true } }).execute()
db.domainVerification.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.domainVerification.create({ data: { attempts: '<Int>', databaseId: '<UUID>', domainId: '<UUID>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' }, select: { id: true } }).execute()
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
  data: { attempts: '<Int>', databaseId: '<UUID>', domainId: '<UUID>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
