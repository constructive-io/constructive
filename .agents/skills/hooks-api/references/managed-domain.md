# managedDomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One row per cert-bearing host or wildcard; tracks domain verification and TLS provisioning independently of services_public.domains. Reconcilers match a route's root domain to a row here by string (no FK/coupling in v1)

## Usage

```typescript
useManagedDomainsQuery({ selection: { fields: { allowPublicUsage: true, annotations: true, certStatus: true, databaseId: true, domain: true, id: true, isWildcard: true, tlsReadyAt: true, tlsStatus: true, verificationStatus: true, verifiedAt: true } } })
useManagedDomainQuery({ id: '<UUID>', selection: { fields: { allowPublicUsage: true, annotations: true, certStatus: true, databaseId: true, domain: true, id: true, isWildcard: true, tlsReadyAt: true, tlsStatus: true, verificationStatus: true, verifiedAt: true } } })
useCreateManagedDomainMutation({ selection: { fields: { id: true } } })
useUpdateManagedDomainMutation({ selection: { fields: { id: true } } })
useDeleteManagedDomainMutation({})
```

## Examples

### List all managedDomains

```typescript
const { data, isLoading } = useManagedDomainsQuery({
  selection: { fields: { allowPublicUsage: true, annotations: true, certStatus: true, databaseId: true, domain: true, id: true, isWildcard: true, tlsReadyAt: true, tlsStatus: true, verificationStatus: true, verifiedAt: true } },
});
```

### Create a managedDomain

```typescript
const { mutate } = useCreateManagedDomainMutation({
  selection: { fields: { id: true } },
});
mutate({ allowPublicUsage: '<Boolean>', annotations: '<JSON>', certStatus: '<String>', databaseId: '<UUID>', domain: '<Hostname>', isWildcard: '<Boolean>', tlsReadyAt: '<Datetime>', tlsStatus: '<String>', verificationStatus: '<String>', verifiedAt: '<Datetime>' });
```
