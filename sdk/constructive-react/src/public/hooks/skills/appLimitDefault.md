# hooks-appLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppLimitDefault data operations

## Usage

```typescript
useAppLimitDefaultsQuery({ selection: { fields: { id: true, name: true, max: true } } })
useAppLimitDefaultQuery({ id: '<value>', selection: { fields: { id: true, name: true, max: true } } })
useCreateAppLimitDefaultMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitDefaultMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitDefaultMutation({})
```

## Examples

### List all appLimitDefaults

```typescript
const { data, isLoading } = useAppLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});
```

### Create a appLimitDefault

```typescript
const { mutate } = useCreateAppLimitDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', max: '<value>' });
```
