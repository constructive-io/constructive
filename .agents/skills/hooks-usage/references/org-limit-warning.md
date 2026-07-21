# orgLimitWarning

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it.

## Usage

```typescript
useOrgLimitWarningsQuery({ selection: { fields: { entityId: true, id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } } })
useOrgLimitWarningQuery({ id: '<UUID>', selection: { fields: { entityId: true, id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } } })
useCreateOrgLimitWarningMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitWarningMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitWarningMutation({})
```

## Examples

### List all orgLimitWarnings

```typescript
const { data, isLoading } = useOrgLimitWarningsQuery({
  selection: { fields: { entityId: true, id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } },
});
```

### Create a orgLimitWarning

```typescript
const { mutate } = useCreateOrgLimitWarningMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', name: '<String>', taskIdentifier: '<String>', thresholdValue: '<BigInt>', warningType: '<String>' });
```
