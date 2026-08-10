# planOverride

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity limit overrides that take precedence over plan defaults

## Usage

```typescript
usePlanOverridesQuery({ selection: { fields: { entityId: true, expiresAt: true, id: true, limitName: true, maxValue: true, reason: true } } })
usePlanOverrideQuery({ id: '<UUID>', selection: { fields: { entityId: true, expiresAt: true, id: true, limitName: true, maxValue: true, reason: true } } })
useCreatePlanOverrideMutation({ selection: { fields: { id: true } } })
useUpdatePlanOverrideMutation({ selection: { fields: { id: true } } })
useDeletePlanOverrideMutation({})
```

## Examples

### List all planOverrides

```typescript
const { data, isLoading } = usePlanOverridesQuery({
  selection: { fields: { entityId: true, expiresAt: true, id: true, limitName: true, maxValue: true, reason: true } },
});
```

### Create a planOverride

```typescript
const { mutate } = useCreatePlanOverrideMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', expiresAt: '<Datetime>', limitName: '<String>', maxValue: '<BigInt>', reason: '<String>' });
```
