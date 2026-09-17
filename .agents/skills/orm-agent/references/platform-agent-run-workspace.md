# platformAgentRunWorkspace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One repository an agent run works in: its remote, branch, commits and how the work is published

## Usage

```typescript
db.platformAgentRunWorkspace.findMany({ select: { id: true } }).execute()
db.platformAgentRunWorkspace.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentRunWorkspace.create({ data: { actorId: '<UUID>', artifacts: '<JSON>', baseBranch: '<String>', baseCommit: '<String>', branch: '<String>', clonedAt: '<Datetime>', headCommit: '<String>', lastUsedAt: '<Datetime>', ordinal: '<Int>', provider: '<String>', publication: '<String>', repo: '<String>', repositoryId: '<UUID>', runId: '<UUID>', state: '<String>', visibility: '<String>' }, select: { id: true } }).execute()
db.platformAgentRunWorkspace.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformAgentRunWorkspace.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentRunWorkspace records

```typescript
const items = await db.platformAgentRunWorkspace.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformAgentRunWorkspace

```typescript
const item = await db.platformAgentRunWorkspace.create({
  data: { actorId: '<UUID>', artifacts: '<JSON>', baseBranch: '<String>', baseCommit: '<String>', branch: '<String>', clonedAt: '<Datetime>', headCommit: '<String>', lastUsedAt: '<Datetime>', ordinal: '<Int>', provider: '<String>', publication: '<String>', repo: '<String>', repositoryId: '<UUID>', runId: '<UUID>', state: '<String>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
