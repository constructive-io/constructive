# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site

## Usage

```typescript
useDomainsQuery({ selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, serviceId: true, subdomain: true, domain: true, labels: true, annotations: true } } })
useDomainQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, serviceId: true, subdomain: true, domain: true, labels: true, annotations: true } } })
useCreateDomainMutation({ selection: { fields: { id: true } } })
useUpdateDomainMutation({ selection: { fields: { id: true } } })
useDeleteDomainMutation({})
```

## Examples

### List all domains

```typescript
const { data, isLoading } = useDomainsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, serviceId: true, subdomain: true, domain: true, labels: true, annotations: true } },
});
```

### Create a domain

```typescript
const { mutate } = useCreateDomainMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', apiId: '<UUID>', siteId: '<UUID>', serviceId: '<UUID>', subdomain: '<Hostname>', domain: '<Hostname>', labels: '<JSON>', annotations: '<JSON>' });
```
