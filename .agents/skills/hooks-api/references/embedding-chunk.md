# embeddingChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EmbeddingChunk data operations

## Usage

```typescript
useEmbeddingChunksQuery({ selection: { fields: { chunkOverlap: true, chunkSize: true, chunkStrategy: true, chunkingTaskName: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, createdAt: true, databaseId: true, dimensions: true, embeddingFieldId: true, embeddingModel: true, embeddingProvider: true, enqueueChunkingJob: true, id: true, metadataFields: true, metric: true, parentFkFieldId: true, searchIndexes: true, tableId: true, updatedAt: true } } })
useEmbeddingChunkQuery({ id: '<UUID>', selection: { fields: { chunkOverlap: true, chunkSize: true, chunkStrategy: true, chunkingTaskName: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, createdAt: true, databaseId: true, dimensions: true, embeddingFieldId: true, embeddingModel: true, embeddingProvider: true, enqueueChunkingJob: true, id: true, metadataFields: true, metric: true, parentFkFieldId: true, searchIndexes: true, tableId: true, updatedAt: true } } })
useCreateEmbeddingChunkMutation({ selection: { fields: { id: true } } })
useUpdateEmbeddingChunkMutation({ selection: { fields: { id: true } } })
useDeleteEmbeddingChunkMutation({})
```

## Examples

### List all embeddingChunks

```typescript
const { data, isLoading } = useEmbeddingChunksQuery({
  selection: { fields: { chunkOverlap: true, chunkSize: true, chunkStrategy: true, chunkingTaskName: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, createdAt: true, databaseId: true, dimensions: true, embeddingFieldId: true, embeddingModel: true, embeddingProvider: true, enqueueChunkingJob: true, id: true, metadataFields: true, metric: true, parentFkFieldId: true, searchIndexes: true, tableId: true, updatedAt: true } },
});
```

### Create a embeddingChunk

```typescript
const { mutate } = useCreateEmbeddingChunkMutation({
  selection: { fields: { id: true } },
});
mutate({ chunkOverlap: '<Int>', chunkSize: '<Int>', chunkStrategy: '<String>', chunkingTaskName: '<String>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', databaseId: '<UUID>', dimensions: '<Int>', embeddingFieldId: '<UUID>', embeddingModel: '<String>', embeddingProvider: '<String>', enqueueChunkingJob: '<Boolean>', metadataFields: '<JSON>', metric: '<String>', parentFkFieldId: '<UUID>', searchIndexes: '<JSON>', tableId: '<UUID>' });
```
