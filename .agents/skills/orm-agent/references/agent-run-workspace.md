# agentRunWorkspace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One repository an agent run works in: its remote, branch, commits and how the work is published

## Usage

```typescript
db.agentRunWorkspace.findMany({ select: { id: true } }).execute()
db.agentRunWorkspace.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentRunWorkspace.create({ data: { actorId: '<UUID>', artifacts: '<JSON>', baseBranch: '<String>', baseCommit: '<String>', branch: '<String>', clonedAt: '<Datetime>', databaseId: '<UUID>', headCommit: '<String>', lastUsedAt: '<Datetime>', ordinal: '<Int>', provider: '<String>', publication: '<String>', repo: '<String>', repositoryId: '<UUID>', runId: '<UUID>', state: '<String>', visibility: '<String>' }, select: { id: true } }).execute()
db.agentRunWorkspace.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.agentRunWorkspace.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentRunWorkspace records

```typescript
const items = await db.agentRunWorkspace.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a agentRunWorkspace

```typescript
const item = await db.agentRunWorkspace.create({
  data: { actorId: '<UUID>', artifacts: '<JSON>', baseBranch: '<String>', baseCommit: '<String>', branch: '<String>', clonedAt: '<Datetime>', databaseId: '<UUID>', headCommit: '<String>', lastUsedAt: '<Datetime>', ordinal: '<Int>', provider: '<String>', publication: '<String>', repo: '<String>', repositoryId: '<UUID>', runId: '<UUID>', state: '<String>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
