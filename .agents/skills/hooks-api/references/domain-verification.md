# domainVerification

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ownership verification challenges issued for a domain

## Usage

```typescript
useDomainVerificationsQuery({ selection: { fields: { attempts: true, createdAt: true, databaseId: true, domainId: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } } })
useDomainVerificationQuery({ id: '<UUID>', selection: { fields: { attempts: true, createdAt: true, databaseId: true, domainId: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } } })
useCreateDomainVerificationMutation({ selection: { fields: { id: true } } })
useUpdateDomainVerificationMutation({ selection: { fields: { id: true } } })
useDeleteDomainVerificationMutation({})
```

## Examples

### List all domainVerifications

```typescript
const { data, isLoading } = useDomainVerificationsQuery({
  selection: { fields: { attempts: true, createdAt: true, databaseId: true, domainId: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } },
});
```

### Create a domainVerification

```typescript
const { mutate } = useCreateDomainVerificationMutation({
  selection: { fields: { id: true } },
});
mutate({ attempts: '<Int>', databaseId: '<UUID>', domainId: '<UUID>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' });
```
