# embeddingChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EmbeddingChunk data operations

## Usage

```typescript
useEmbeddingChunksQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, enqueueChunkingJob: true, chunkingTaskName: true, parentFkFieldId: true, createdAt: true, updatedAt: true } } })
useEmbeddingChunkQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, enqueueChunkingJob: true, chunkingTaskName: true, parentFkFieldId: true, createdAt: true, updatedAt: true } } })
useCreateEmbeddingChunkMutation({ selection: { fields: { id: true } } })
useUpdateEmbeddingChunkMutation({ selection: { fields: { id: true } } })
useDeleteEmbeddingChunkMutation({})
```

## Examples

### List all embeddingChunks

```typescript
const { data, isLoading } = useEmbeddingChunksQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, enqueueChunkingJob: true, chunkingTaskName: true, parentFkFieldId: true, createdAt: true, updatedAt: true } },
});
```

### Create a embeddingChunk

```typescript
const { mutate } = useCreateEmbeddingChunkMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', embeddingFieldId: '<UUID>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', dimensions: '<Int>', metric: '<String>', chunkSize: '<Int>', chunkOverlap: '<Int>', chunkStrategy: '<String>', metadataFields: '<JSON>', enqueueChunkingJob: '<Boolean>', chunkingTaskName: '<String>', parentFkFieldId: '<UUID>' });
```
