# platformBuildStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only step and test results of a build, keyed into its log object

## Usage

```typescript
db.platformBuildStep.findMany({ select: { id: true } }).execute()
db.platformBuildStep.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformBuildStep.create({ data: { buildId: '<UUID>', createdByPrincipal: '<UUID>', exitCode: '<Int>', finishedAt: '<Datetime>', kind: '<String>', logBytes: '<BigInt>', logOffset: '<BigInt>', name: '<String>', parentSeq: '<Int>', recordedAt: '<Datetime>', seq: '<Int>', startedAt: '<Datetime>', status: '<String>', summary: '<JSON>' }, select: { id: true } }).execute()
db.platformBuildStep.update({ where: { id: '<UUID>' }, data: { buildId: '<UUID>' }, select: { id: true } }).execute()
db.platformBuildStep.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformBuildStep records

```typescript
const items = await db.platformBuildStep.findMany({
  select: { id: true, buildId: true }
}).execute();
```

### Create a platformBuildStep

```typescript
const item = await db.platformBuildStep.create({
  data: { buildId: '<UUID>', createdByPrincipal: '<UUID>', exitCode: '<Int>', finishedAt: '<Datetime>', kind: '<String>', logBytes: '<BigInt>', logOffset: '<BigInt>', name: '<String>', parentSeq: '<Int>', recordedAt: '<Datetime>', seq: '<Int>', startedAt: '<Datetime>', status: '<String>', summary: '<JSON>' },
  select: { id: true }
}).execute();
```
