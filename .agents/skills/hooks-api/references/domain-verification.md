# domainVerification

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One row per outstanding/completed ownership-verification challenge for a managed_domain. Holds the PUBLIC challenge the user must publish (e.g. a DNS TXT record value) — this is a verification token, NOT a secret. Entity-owned via owner_id and read/written through the AuthzEntityMembership scoped-module security path gated on manage_domains.

## Usage

```typescript
useDomainVerificationsQuery({ selection: { fields: { attempts: true, createdAt: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, ownerId: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } } })
useDomainVerificationQuery({ id: '<UUID>', selection: { fields: { attempts: true, createdAt: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, ownerId: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } } })
useCreateDomainVerificationMutation({ selection: { fields: { id: true } } })
useUpdateDomainVerificationMutation({ selection: { fields: { id: true } } })
useDeleteDomainVerificationMutation({})
```

## Examples

### List all domainVerifications

```typescript
const { data, isLoading } = useDomainVerificationsQuery({
  selection: { fields: { attempts: true, createdAt: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, ownerId: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } },
});
```

### Create a domainVerification

```typescript
const { mutate } = useCreateDomainVerificationMutation({
  selection: { fields: { id: true } },
});
mutate({ attempts: '<Int>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', ownerId: '<UUID>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' });
```
