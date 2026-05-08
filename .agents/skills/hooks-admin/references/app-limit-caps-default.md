# appLimitCapsDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers.

## Usage

```typescript
useAppLimitCapsDefaultsQuery({ selection: { fields: { id: true, name: true, max: true } } })
useAppLimitCapsDefaultQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, max: true } } })
useCreateAppLimitCapsDefaultMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCapsDefaultMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCapsDefaultMutation({})
```

## Examples

### List all appLimitCapsDefaults

```typescript
const { data, isLoading } = useAppLimitCapsDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});
```

### Create a appLimitCapsDefault

```typescript
const { mutate } = useCreateAppLimitCapsDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', max: '<BigInt>' });
```
