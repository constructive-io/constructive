# platformBuild

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One run of a repository workflow: its commit, its job, and what it produced

## Usage

```typescript
db.platformBuild.findMany({ select: { id: true } }).execute()
db.platformBuild.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformBuild.create({ data: { actorId: '<UUID>', catalogImageId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', eventId: '<UUID>', finishedAt: '<Datetime>', jobId: '<BigInt>', logs: '<Upload>', metadata: '<JSON>', proposalId: '<UUID>', ref: '<String>', repositoryId: '<UUID>', startedAt: '<Datetime>', status: '<String>', updatedByPrincipal: '<UUID>', workflowId: '<UUID>' }, select: { id: true } }).execute()
db.platformBuild.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformBuild.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformBuild records

```typescript
const items = await db.platformBuild.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformBuild

```typescript
const item = await db.platformBuild.create({
  data: { actorId: '<UUID>', catalogImageId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', eventId: '<UUID>', finishedAt: '<Datetime>', jobId: '<BigInt>', logs: '<Upload>', metadata: '<JSON>', proposalId: '<UUID>', ref: '<String>', repositoryId: '<UUID>', startedAt: '<Datetime>', status: '<String>', updatedByPrincipal: '<UUID>', workflowId: '<UUID>' },
  select: { id: true }
}).execute();
```
