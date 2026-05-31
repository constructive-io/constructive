# appLimitWarning

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it.

## Usage

```typescript
useAppLimitWarningsQuery({ selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } } })
useAppLimitWarningQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } } })
useCreateAppLimitWarningMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitWarningMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitWarningMutation({})
```

## Examples

### List all appLimitWarnings

```typescript
const { data, isLoading } = useAppLimitWarningsQuery({
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } },
});
```

### Create a appLimitWarning

```typescript
const { mutate } = useCreateAppLimitWarningMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>' });
```
