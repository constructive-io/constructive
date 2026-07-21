# appLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default maximum values for each named limit, applied when no per-actor override exists

## Usage

```typescript
useAppLimitDefaultsQuery({ selection: { fields: { id: true, max: true, name: true, softMax: true } } })
useAppLimitDefaultQuery({ id: '<UUID>', selection: { fields: { id: true, max: true, name: true, softMax: true } } })
useCreateAppLimitDefaultMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitDefaultMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitDefaultMutation({})
```

## Examples

### List all appLimitDefaults

```typescript
const { data, isLoading } = useAppLimitDefaultsQuery({
  selection: { fields: { id: true, max: true, name: true, softMax: true } },
});
```

### Create a appLimitDefault

```typescript
const { mutate } = useCreateAppLimitDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ max: '<BigInt>', name: '<String>', softMax: '<BigInt>' });
```
