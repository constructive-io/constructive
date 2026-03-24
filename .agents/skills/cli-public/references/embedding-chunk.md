# embeddingChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EmbeddingChunk records via csdk CLI

## Usage

```bash
csdk embedding-chunk list
csdk embedding-chunk get --id <UUID>
csdk embedding-chunk create --tableId <UUID> [--databaseId <UUID>] [--embeddingFieldId <UUID>] [--chunksTableId <UUID>] [--chunksTableName <String>] [--contentFieldName <String>] [--dimensions <Int>] [--metric <String>] [--chunkSize <Int>] [--chunkOverlap <Int>] [--chunkStrategy <String>] [--metadataFields <JSON>] [--enqueueChunkingJob <Boolean>] [--chunkingTaskName <String>] [--parentFkFieldId <UUID>]
csdk embedding-chunk update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--embeddingFieldId <UUID>] [--chunksTableId <UUID>] [--chunksTableName <String>] [--contentFieldName <String>] [--dimensions <Int>] [--metric <String>] [--chunkSize <Int>] [--chunkOverlap <Int>] [--chunkStrategy <String>] [--metadataFields <JSON>] [--enqueueChunkingJob <Boolean>] [--chunkingTaskName <String>] [--parentFkFieldId <UUID>]
csdk embedding-chunk delete --id <UUID>
```

## Examples

### List all embeddingChunk records

```bash
csdk embedding-chunk list
```

### Create a embeddingChunk

```bash
csdk embedding-chunk create --tableId <UUID> [--databaseId <UUID>] [--embeddingFieldId <UUID>] [--chunksTableId <UUID>] [--chunksTableName <String>] [--contentFieldName <String>] [--dimensions <Int>] [--metric <String>] [--chunkSize <Int>] [--chunkOverlap <Int>] [--chunkStrategy <String>] [--metadataFields <JSON>] [--enqueueChunkingJob <Boolean>] [--chunkingTaskName <String>] [--parentFkFieldId <UUID>]
```

### Get a embeddingChunk by id

```bash
csdk embedding-chunk get --id <value>
```
