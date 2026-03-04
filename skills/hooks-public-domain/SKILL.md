---
name: hooks-public-domain
description: DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site
---

# hooks-public-domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site

## Usage

```typescript
useDomainsQuery({ selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } } })
useDomainQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } } })
useCreateDomainMutation({ selection: { fields: { id: true } } })
useUpdateDomainMutation({ selection: { fields: { id: true } } })
useDeleteDomainMutation({})
```

## Examples

### List all domains

```typescript
const { data, isLoading } = useDomainsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } },
});
```

### Create a domain

```typescript
const { mutate } = useCreateDomainMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', apiId: '<value>', siteId: '<value>', subdomain: '<value>', domain: '<value>' });
```
