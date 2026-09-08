# platformDomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Fully-qualified hostnames owned by this scope; each row claims its hostname globally through the catalog

## Usage

```typescript
usePlatformDomainsQuery({ selection: { fields: { config: true, createdAt: true, createdByPrincipal: true, hostname: true, id: true, isPublished: true, isWildcard: true, managed: true, parentHostname: true, tlsReadyAt: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, updatedByPrincipal: true, verificationStatus: true, verifiedAt: true } } })
usePlatformDomainQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, createdByPrincipal: true, hostname: true, id: true, isPublished: true, isWildcard: true, managed: true, parentHostname: true, tlsReadyAt: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, updatedByPrincipal: true, verificationStatus: true, verifiedAt: true } } })
useCreatePlatformDomainMutation({ selection: { fields: { id: true } } })
useUpdatePlatformDomainMutation({ selection: { fields: { id: true } } })
useDeletePlatformDomainMutation({})
```

## Examples

### List all platformDomains

```typescript
const { data, isLoading } = usePlatformDomainsQuery({
  selection: { fields: { config: true, createdAt: true, createdByPrincipal: true, hostname: true, id: true, isPublished: true, isWildcard: true, managed: true, parentHostname: true, tlsReadyAt: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, updatedByPrincipal: true, verificationStatus: true, verifiedAt: true } },
});
```

### Create a platformDomain

```typescript
const { mutate } = useCreatePlatformDomainMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', createdByPrincipal: '<UUID>', hostname: '<String>', isPublished: '<Boolean>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsReadyAt: '<Datetime>', tlsSecretName: '<String>', tlsStatus: '<String>', updatedByPrincipal: '<UUID>', verificationStatus: '<String>', verifiedAt: '<Datetime>' });
```
