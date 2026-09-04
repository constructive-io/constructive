# proposalsChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ProposalsChunk data operations

## Usage

```typescript
useProposalsChunksQuery({ selection: { fields: { actorId: true, body: true, chunkIndex: true, createdAt: true, databaseId: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, proposalsId: true, searchScore: true, updatedAt: true } } })
useProposalsChunkQuery({ id: '<UUID>', selection: { fields: { actorId: true, body: true, chunkIndex: true, createdAt: true, databaseId: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, proposalsId: true, searchScore: true, updatedAt: true } } })
useCreateProposalsChunkMutation({ selection: { fields: { id: true } } })
useUpdateProposalsChunkMutation({ selection: { fields: { id: true } } })
useDeleteProposalsChunkMutation({})
```

## Examples

### List all proposalsChunks

```typescript
const { data, isLoading } = useProposalsChunksQuery({
  selection: { fields: { actorId: true, body: true, chunkIndex: true, createdAt: true, databaseId: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, proposalsId: true, searchScore: true, updatedAt: true } },
});
```

### Create a proposalsChunk

```typescript
const { mutate } = useCreateProposalsChunkMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', body: '<String>', chunkIndex: '<Int>', databaseId: '<UUID>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', proposalsId: '<UUID>', searchScore: '<Float>' });
```
