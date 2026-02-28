# hooks-domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Domain data operations

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
