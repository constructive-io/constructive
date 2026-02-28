# hooks-appLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppLimit data operations

## Usage

```typescript
useAppLimitsQuery({ selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } } })
useAppLimitQuery({ id: '<value>', selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } } })
useCreateAppLimitMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitMutation({})
```

## Examples

### List all appLimits

```typescript
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } },
});
```

### Create a appLimit

```typescript
const { mutate } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', actorId: '<value>', num: '<value>', max: '<value>' });
```
