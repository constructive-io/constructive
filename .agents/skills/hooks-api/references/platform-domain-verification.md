# platformDomainVerification

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ownership verification challenges issued for a domain

## Usage

```typescript
usePlatformDomainVerificationsQuery({ selection: { fields: { attempts: true, createdAt: true, domainId: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } } })
usePlatformDomainVerificationQuery({ id: '<UUID>', selection: { fields: { attempts: true, createdAt: true, domainId: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } } })
useCreatePlatformDomainVerificationMutation({ selection: { fields: { id: true } } })
useUpdatePlatformDomainVerificationMutation({ selection: { fields: { id: true } } })
useDeletePlatformDomainVerificationMutation({})
```

## Examples

### List all platformDomainVerifications

```typescript
const { data, isLoading } = usePlatformDomainVerificationsQuery({
  selection: { fields: { attempts: true, createdAt: true, domainId: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } },
});
```

### Create a platformDomainVerification

```typescript
const { mutate } = useCreatePlatformDomainVerificationMutation({
  selection: { fields: { id: true } },
});
mutate({ attempts: '<Int>', domainId: '<UUID>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' });
```
