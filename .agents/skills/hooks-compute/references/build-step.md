# buildStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only step and test results of a build, keyed into its log object

## Usage

```typescript
useBuildStepsQuery({ selection: { fields: { buildId: true, createdByPrincipal: true, databaseId: true, exitCode: true, finishedAt: true, id: true, kind: true, logBytes: true, logOffset: true, name: true, parentSeq: true, recordedAt: true, seq: true, startedAt: true, status: true, summary: true } } })
useBuildStepQuery({ id: '<UUID>', selection: { fields: { buildId: true, createdByPrincipal: true, databaseId: true, exitCode: true, finishedAt: true, id: true, kind: true, logBytes: true, logOffset: true, name: true, parentSeq: true, recordedAt: true, seq: true, startedAt: true, status: true, summary: true } } })
useCreateBuildStepMutation({ selection: { fields: { id: true } } })
useUpdateBuildStepMutation({ selection: { fields: { id: true } } })
useDeleteBuildStepMutation({})
```

## Examples

### List all buildSteps

```typescript
const { data, isLoading } = useBuildStepsQuery({
  selection: { fields: { buildId: true, createdByPrincipal: true, databaseId: true, exitCode: true, finishedAt: true, id: true, kind: true, logBytes: true, logOffset: true, name: true, parentSeq: true, recordedAt: true, seq: true, startedAt: true, status: true, summary: true } },
});
```

### Create a buildStep

```typescript
const { mutate } = useCreateBuildStepMutation({
  selection: { fields: { id: true } },
});
mutate({ buildId: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', exitCode: '<Int>', finishedAt: '<Datetime>', kind: '<String>', logBytes: '<BigInt>', logOffset: '<BigInt>', name: '<String>', parentSeq: '<Int>', recordedAt: '<Datetime>', seq: '<Int>', startedAt: '<Datetime>', status: '<String>', summary: '<JSON>' });
```
