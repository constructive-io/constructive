# build

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One run of a repository workflow: its commit, its job, and what it produced

## Usage

```typescript
db.build.findMany({ select: { id: true } }).execute()
db.build.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.build.create({ data: { actorId: '<UUID>', catalogImageId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', eventId: '<UUID>', finishedAt: '<Datetime>', jobId: '<BigInt>', logs: '<Upload>', metadata: '<JSON>', proposalId: '<UUID>', ref: '<String>', repositoryId: '<UUID>', startedAt: '<Datetime>', status: '<String>', updatedByPrincipal: '<UUID>', workflowId: '<UUID>' }, select: { id: true } }).execute()
db.build.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.build.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all build records

```typescript
const items = await db.build.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a build

```typescript
const item = await db.build.create({
  data: { actorId: '<UUID>', catalogImageId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', eventId: '<UUID>', finishedAt: '<Datetime>', jobId: '<BigInt>', logs: '<Upload>', metadata: '<JSON>', proposalId: '<UUID>', ref: '<String>', repositoryId: '<UUID>', startedAt: '<Datetime>', status: '<String>', updatedByPrincipal: '<UUID>', workflowId: '<UUID>' },
  select: { id: true }
}).execute();
```
