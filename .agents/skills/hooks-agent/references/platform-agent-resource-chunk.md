# platformAgentResourceChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformAgentResourceChunk data operations

## Usage

```typescript
usePlatformAgentResourceChunksQuery({ selection: { fields: { body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, platformAgentResourceId: true, searchScore: true, updatedAt: true } } })
usePlatformAgentResourceChunkQuery({ id: '<UUID>', selection: { fields: { body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, platformAgentResourceId: true, searchScore: true, updatedAt: true } } })
useCreatePlatformAgentResourceChunkMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentResourceChunkMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentResourceChunkMutation({})
```

## Examples

### List all platformAgentResourceChunks

```typescript
const { data, isLoading } = usePlatformAgentResourceChunksQuery({
  selection: { fields: { body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, platformAgentResourceId: true, searchScore: true, updatedAt: true } },
});
```

### Create a platformAgentResourceChunk

```typescript
const { mutate } = useCreatePlatformAgentResourceChunkMutation({
  selection: { fields: { id: true } },
});
mutate({ body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', platformAgentResourceId: '<UUID>', searchScore: '<Float>' });
```
