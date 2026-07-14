# agentResourceChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AgentResourceChunk data operations

## Usage

```typescript
useAgentResourceChunksQuery({ selection: { fields: { agentResourceId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, searchScore: true, updatedAt: true } } })
useAgentResourceChunkQuery({ id: '<UUID>', selection: { fields: { agentResourceId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, searchScore: true, updatedAt: true } } })
useCreateAgentResourceChunkMutation({ selection: { fields: { id: true } } })
useUpdateAgentResourceChunkMutation({ selection: { fields: { id: true } } })
useDeleteAgentResourceChunkMutation({})
```

## Examples

### List all agentResourceChunks

```typescript
const { data, isLoading } = useAgentResourceChunksQuery({
  selection: { fields: { agentResourceId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, searchScore: true, updatedAt: true } },
});
```

### Create a agentResourceChunk

```typescript
const { mutate } = useCreateAgentResourceChunkMutation({
  selection: { fields: { id: true } },
});
mutate({ agentResourceId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', searchScore: '<Float>' });
```
