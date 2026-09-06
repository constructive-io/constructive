# platformBuildStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only step and test results of a build, keyed into its log object

## Usage

```typescript
usePlatformBuildStepsQuery({ selection: { fields: { buildId: true, createdByPrincipal: true, exitCode: true, finishedAt: true, id: true, kind: true, logBytes: true, logOffset: true, name: true, parentSeq: true, recordedAt: true, seq: true, startedAt: true, status: true, summary: true } } })
usePlatformBuildStepQuery({ id: '<UUID>', selection: { fields: { buildId: true, createdByPrincipal: true, exitCode: true, finishedAt: true, id: true, kind: true, logBytes: true, logOffset: true, name: true, parentSeq: true, recordedAt: true, seq: true, startedAt: true, status: true, summary: true } } })
useCreatePlatformBuildStepMutation({ selection: { fields: { id: true } } })
useUpdatePlatformBuildStepMutation({ selection: { fields: { id: true } } })
useDeletePlatformBuildStepMutation({})
```

## Examples

### List all platformBuildSteps

```typescript
const { data, isLoading } = usePlatformBuildStepsQuery({
  selection: { fields: { buildId: true, createdByPrincipal: true, exitCode: true, finishedAt: true, id: true, kind: true, logBytes: true, logOffset: true, name: true, parentSeq: true, recordedAt: true, seq: true, startedAt: true, status: true, summary: true } },
});
```

### Create a platformBuildStep

```typescript
const { mutate } = useCreatePlatformBuildStepMutation({
  selection: { fields: { id: true } },
});
mutate({ buildId: '<UUID>', createdByPrincipal: '<UUID>', exitCode: '<Int>', finishedAt: '<Datetime>', kind: '<String>', logBytes: '<BigInt>', logOffset: '<BigInt>', name: '<String>', parentSeq: '<Int>', recordedAt: '<Datetime>', seq: '<Int>', startedAt: '<Datetime>', status: '<String>', summary: '<JSON>' });
```
