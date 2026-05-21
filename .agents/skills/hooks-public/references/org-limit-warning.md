# orgLimitWarning

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it.

## Usage

```typescript
useOrgLimitWarningsQuery({ selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } } })
useOrgLimitWarningQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } } })
useCreateOrgLimitWarningMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitWarningMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitWarningMutation({})
```

## Examples

### List all orgLimitWarnings

```typescript
const { data, isLoading } = useOrgLimitWarningsQuery({
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } },
});
```

### Create a orgLimitWarning

```typescript
const { mutate } = useCreateOrgLimitWarningMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>', entityId: '<UUID>' });
```
