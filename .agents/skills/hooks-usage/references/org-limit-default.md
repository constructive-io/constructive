# orgLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default maximum values for each named limit, applied when no per-actor override exists

## Usage

```typescript
useOrgLimitDefaultsQuery({ selection: { fields: { id: true, max: true, name: true, softMax: true } } })
useOrgLimitDefaultQuery({ id: '<UUID>', selection: { fields: { id: true, max: true, name: true, softMax: true } } })
useCreateOrgLimitDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitDefaultMutation({})
```

## Examples

### List all orgLimitDefaults

```typescript
const { data, isLoading } = useOrgLimitDefaultsQuery({
  selection: { fields: { id: true, max: true, name: true, softMax: true } },
});
```

### Create a orgLimitDefault

```typescript
const { mutate } = useCreateOrgLimitDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ max: '<BigInt>', name: '<String>', softMax: '<BigInt>' });
```
