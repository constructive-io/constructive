# embeddingChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EmbeddingChunk records

## Usage

```typescript
db.embeddingChunk.findMany({ select: { id: true } }).execute()
db.embeddingChunk.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.embeddingChunk.create({ data: { chunkOverlap: '<Int>', chunkSize: '<Int>', chunkStrategy: '<String>', chunkingTaskName: '<String>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', databaseId: '<UUID>', dimensions: '<Int>', embeddingFieldId: '<UUID>', embeddingModel: '<String>', embeddingProvider: '<String>', enqueueChunkingJob: '<Boolean>', metadataFields: '<JSON>', metric: '<String>', parentFkFieldId: '<UUID>', searchIndexes: '<JSON>', tableId: '<UUID>' }, select: { id: true } }).execute()
db.embeddingChunk.update({ where: { id: '<UUID>' }, data: { chunkOverlap: '<Int>' }, select: { id: true } }).execute()
db.embeddingChunk.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all embeddingChunk records

```typescript
const items = await db.embeddingChunk.findMany({
  select: { id: true, chunkOverlap: true }
}).execute();
```

### Create a embeddingChunk

```typescript
const item = await db.embeddingChunk.create({
  data: { chunkOverlap: '<Int>', chunkSize: '<Int>', chunkStrategy: '<String>', chunkingTaskName: '<String>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', databaseId: '<UUID>', dimensions: '<Int>', embeddingFieldId: '<UUID>', embeddingModel: '<String>', embeddingProvider: '<String>', enqueueChunkingJob: '<Boolean>', metadataFields: '<JSON>', metric: '<String>', parentFkFieldId: '<UUID>', searchIndexes: '<JSON>', tableId: '<UUID>' },
  select: { id: true }
}).execute();
```
