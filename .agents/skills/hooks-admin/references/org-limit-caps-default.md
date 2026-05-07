# orgLimitCapsDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers.

## Usage

```typescript
useOrgLimitCapsDefaultsQuery({ selection: { fields: { id: true, name: true, max: true } } })
useOrgLimitCapsDefaultQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, max: true } } })
useCreateOrgLimitCapsDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitCapsDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitCapsDefaultMutation({})
```

## Examples

### List all orgLimitCapsDefaults

```typescript
const { data, isLoading } = useOrgLimitCapsDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});
```

### Create a orgLimitCapsDefault

```typescript
const { mutate } = useCreateOrgLimitCapsDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', max: '<BigInt>' });
```
