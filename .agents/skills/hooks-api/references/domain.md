# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site

## Usage

```typescript
useDomainsQuery({ selection: { fields: { annotations: true, apiId: true, databaseId: true, domain: true, id: true, labels: true, serviceId: true, siteId: true, subdomain: true } } })
useDomainQuery({ id: '<UUID>', selection: { fields: { annotations: true, apiId: true, databaseId: true, domain: true, id: true, labels: true, serviceId: true, siteId: true, subdomain: true } } })
useCreateDomainMutation({ selection: { fields: { id: true } } })
useUpdateDomainMutation({ selection: { fields: { id: true } } })
useDeleteDomainMutation({})
```

## Examples

### List all domains

```typescript
const { data, isLoading } = useDomainsQuery({
  selection: { fields: { annotations: true, apiId: true, databaseId: true, domain: true, id: true, labels: true, serviceId: true, siteId: true, subdomain: true } },
});
```

### Create a domain

```typescript
const { mutate } = useCreateDomainMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', apiId: '<UUID>', databaseId: '<UUID>', domain: '<Hostname>', labels: '<JSON>', serviceId: '<UUID>', siteId: '<UUID>', subdomain: '<Hostname>' });
```
