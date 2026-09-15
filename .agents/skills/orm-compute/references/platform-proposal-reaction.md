# platformProposalReaction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Emoji reactions to a local proposal or one of its comments

## Usage

```typescript
db.platformProposalReaction.findMany({ select: { id: true } }).execute()
db.platformProposalReaction.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformProposalReaction.create({ data: { actorId: '<UUID>', commentId: '<UUID>', createdByPrincipal: '<UUID>', emoji: '<String>', proposalId: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformProposalReaction.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformProposalReaction.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformProposalReaction records

```typescript
const items = await db.platformProposalReaction.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformProposalReaction

```typescript
const item = await db.platformProposalReaction.create({
  data: { actorId: '<UUID>', commentId: '<UUID>', createdByPrincipal: '<UUID>', emoji: '<String>', proposalId: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
