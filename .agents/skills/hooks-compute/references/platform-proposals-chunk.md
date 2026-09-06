# platformProposalsChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformProposalsChunk data operations

## Usage

```typescript
usePlatformProposalsChunksQuery({ selection: { fields: { actorId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, platformProposalsId: true, searchScore: true, updatedAt: true } } })
usePlatformProposalsChunkQuery({ id: '<UUID>', selection: { fields: { actorId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, platformProposalsId: true, searchScore: true, updatedAt: true } } })
useCreatePlatformProposalsChunkMutation({ selection: { fields: { id: true } } })
useUpdatePlatformProposalsChunkMutation({ selection: { fields: { id: true } } })
useDeletePlatformProposalsChunkMutation({})
```

## Examples

### List all platformProposalsChunks

```typescript
const { data, isLoading } = usePlatformProposalsChunksQuery({
  selection: { fields: { actorId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, platformProposalsId: true, searchScore: true, updatedAt: true } },
});
```

### Create a platformProposalsChunk

```typescript
const { mutate } = useCreatePlatformProposalsChunkMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', platformProposalsId: '<UUID>', searchScore: '<Float>' });
```
