# hooks-orgLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgLimitDefault data operations

## Usage

```typescript
useOrgLimitDefaultsQuery({ selection: { fields: { id: true, name: true, max: true } } })
useOrgLimitDefaultQuery({ id: '<value>', selection: { fields: { id: true, name: true, max: true } } })
useCreateOrgLimitDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitDefaultMutation({})
```

## Examples

### List all orgLimitDefaults

```typescript
const { data, isLoading } = useOrgLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});
```

### Create a orgLimitDefault

```typescript
const { mutate } = useCreateOrgLimitDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', max: '<value>' });
```
