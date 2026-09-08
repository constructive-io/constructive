# buildStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only step and test results of a build, keyed into its log object

## Usage

```typescript
db.buildStep.findMany({ select: { id: true } }).execute()
db.buildStep.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.buildStep.create({ data: { buildId: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', exitCode: '<Int>', finishedAt: '<Datetime>', kind: '<String>', logBytes: '<BigInt>', logOffset: '<BigInt>', name: '<String>', parentSeq: '<Int>', recordedAt: '<Datetime>', seq: '<Int>', startedAt: '<Datetime>', status: '<String>', summary: '<JSON>' }, select: { id: true } }).execute()
db.buildStep.update({ where: { id: '<UUID>' }, data: { buildId: '<UUID>' }, select: { id: true } }).execute()
db.buildStep.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all buildStep records

```typescript
const items = await db.buildStep.findMany({
  select: { id: true, buildId: true }
}).execute();
```

### Create a buildStep

```typescript
const item = await db.buildStep.create({
  data: { buildId: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', exitCode: '<Int>', finishedAt: '<Datetime>', kind: '<String>', logBytes: '<BigInt>', logOffset: '<BigInt>', name: '<String>', parentSeq: '<Int>', recordedAt: '<Datetime>', seq: '<Int>', startedAt: '<Datetime>', status: '<String>', summary: '<JSON>' },
  select: { id: true }
}).execute();
```
