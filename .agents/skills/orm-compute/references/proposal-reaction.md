# proposalReaction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Emoji reactions to a local proposal or one of its comments

## Usage

```typescript
db.proposalReaction.findMany({ select: { id: true } }).execute()
db.proposalReaction.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.proposalReaction.create({ data: { actorId: '<UUID>', commentId: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', emoji: '<String>', proposalId: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.proposalReaction.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.proposalReaction.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all proposalReaction records

```typescript
const items = await db.proposalReaction.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a proposalReaction

```typescript
const item = await db.proposalReaction.create({
  data: { actorId: '<UUID>', commentId: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', emoji: '<String>', proposalId: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
