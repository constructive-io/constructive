# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Fully-qualified hostnames owned by this scope; each row claims its hostname globally through the catalog

## Usage

```typescript
useDomainsQuery({ selection: { fields: { config: true, createdAt: true, databaseId: true, hostname: true, id: true, isPublished: true, isWildcard: true, managed: true, parentHostname: true, tlsReadyAt: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, verificationStatus: true, verifiedAt: true } } })
useDomainQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, databaseId: true, hostname: true, id: true, isPublished: true, isWildcard: true, managed: true, parentHostname: true, tlsReadyAt: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, verificationStatus: true, verifiedAt: true } } })
useCreateDomainMutation({ selection: { fields: { id: true } } })
useUpdateDomainMutation({ selection: { fields: { id: true } } })
useDeleteDomainMutation({})
```

## Examples

### List all domains

```typescript
const { data, isLoading } = useDomainsQuery({
  selection: { fields: { config: true, createdAt: true, databaseId: true, hostname: true, id: true, isPublished: true, isWildcard: true, managed: true, parentHostname: true, tlsReadyAt: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, verificationStatus: true, verifiedAt: true } },
});
```

### Create a domain

```typescript
const { mutate } = useCreateDomainMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', databaseId: '<UUID>', hostname: '<String>', isPublished: '<Boolean>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsReadyAt: '<Datetime>', tlsSecretName: '<String>', tlsStatus: '<String>', verificationStatus: '<String>', verifiedAt: '<Datetime>' });
```
