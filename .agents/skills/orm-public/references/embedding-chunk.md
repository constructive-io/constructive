# embeddingChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EmbeddingChunk records

## Usage

```typescript
db.embeddingChunk.findMany({ select: { id: true } }).execute()
db.embeddingChunk.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.embeddingChunk.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', embeddingFieldId: '<UUID>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', dimensions: '<Int>', metric: '<String>', chunkSize: '<Int>', chunkOverlap: '<Int>', chunkStrategy: '<String>', metadataFields: '<JSON>', enqueueChunkingJob: '<Boolean>', chunkingTaskName: '<String>', parentFkFieldId: '<UUID>' }, select: { id: true } }).execute()
db.embeddingChunk.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.embeddingChunk.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all embeddingChunk records

```typescript
const items = await db.embeddingChunk.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a embeddingChunk

```typescript
const item = await db.embeddingChunk.create({
  data: { databaseId: '<UUID>', tableId: '<UUID>', embeddingFieldId: '<UUID>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', dimensions: '<Int>', metric: '<String>', chunkSize: '<Int>', chunkOverlap: '<Int>', chunkStrategy: '<String>', metadataFields: '<JSON>', enqueueChunkingJob: '<Boolean>', chunkingTaskName: '<String>', parentFkFieldId: '<UUID>' },
  select: { id: true }
}).execute();
```
