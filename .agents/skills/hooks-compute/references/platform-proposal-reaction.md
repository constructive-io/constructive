# platformProposalReaction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Emoji reactions to a local proposal or one of its comments

## Usage

```typescript
usePlatformProposalReactionsQuery({ selection: { fields: { actorId: true, commentId: true, createdAt: true, createdByPrincipal: true, emoji: true, id: true, proposalId: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformProposalReactionQuery({ id: '<UUID>', selection: { fields: { actorId: true, commentId: true, createdAt: true, createdByPrincipal: true, emoji: true, id: true, proposalId: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformProposalReactionMutation({ selection: { fields: { id: true } } })
useUpdatePlatformProposalReactionMutation({ selection: { fields: { id: true } } })
useDeletePlatformProposalReactionMutation({})
```

## Examples

### List all platformProposalReactions

```typescript
const { data, isLoading } = usePlatformProposalReactionsQuery({
  selection: { fields: { actorId: true, commentId: true, createdAt: true, createdByPrincipal: true, emoji: true, id: true, proposalId: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformProposalReaction

```typescript
const { mutate } = useCreatePlatformProposalReactionMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', commentId: '<UUID>', createdByPrincipal: '<UUID>', emoji: '<String>', proposalId: '<UUID>', updatedByPrincipal: '<UUID>' });
```
