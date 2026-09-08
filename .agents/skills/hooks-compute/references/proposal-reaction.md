# proposalReaction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Emoji reactions to a local proposal or one of its comments

## Usage

```typescript
useProposalReactionsQuery({ selection: { fields: { actorId: true, commentId: true, createdAt: true, createdByPrincipal: true, databaseId: true, emoji: true, id: true, proposalId: true, updatedAt: true, updatedByPrincipal: true } } })
useProposalReactionQuery({ id: '<UUID>', selection: { fields: { actorId: true, commentId: true, createdAt: true, createdByPrincipal: true, databaseId: true, emoji: true, id: true, proposalId: true, updatedAt: true, updatedByPrincipal: true } } })
useCreateProposalReactionMutation({ selection: { fields: { id: true } } })
useUpdateProposalReactionMutation({ selection: { fields: { id: true } } })
useDeleteProposalReactionMutation({})
```

## Examples

### List all proposalReactions

```typescript
const { data, isLoading } = useProposalReactionsQuery({
  selection: { fields: { actorId: true, commentId: true, createdAt: true, createdByPrincipal: true, databaseId: true, emoji: true, id: true, proposalId: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a proposalReaction

```typescript
const { mutate } = useCreateProposalReactionMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', commentId: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', emoji: '<String>', proposalId: '<UUID>', updatedByPrincipal: '<UUID>' });
```
