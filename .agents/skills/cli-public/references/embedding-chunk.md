# embeddingChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EmbeddingChunk records via csdk CLI

## Usage

```bash
csdk embedding-chunk list
csdk embedding-chunk list --where.<field>.<op> <value> --orderBy <values>
csdk embedding-chunk list --limit 10 --after <cursor>
csdk embedding-chunk find-first --where.<field>.<op> <value>
csdk embedding-chunk get --id <UUID>
csdk embedding-chunk create --tableId <UUID> [--databaseId <UUID>] [--embeddingFieldId <UUID>] [--chunksTableId <UUID>] [--chunksTableName <String>] [--contentFieldName <String>] [--dimensions <Int>] [--metric <String>] [--chunkSize <Int>] [--chunkOverlap <Int>] [--chunkStrategy <String>] [--metadataFields <JSON>] [--enqueueChunkingJob <Boolean>] [--chunkingTaskName <String>] [--parentFkFieldId <UUID>]
csdk embedding-chunk update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--embeddingFieldId <UUID>] [--chunksTableId <UUID>] [--chunksTableName <String>] [--contentFieldName <String>] [--dimensions <Int>] [--metric <String>] [--chunkSize <Int>] [--chunkOverlap <Int>] [--chunkStrategy <String>] [--metadataFields <JSON>] [--enqueueChunkingJob <Boolean>] [--chunkingTaskName <String>] [--parentFkFieldId <UUID>]
csdk embedding-chunk delete --id <UUID>
```

## Examples

### List embeddingChunk records

```bash
csdk embedding-chunk list
```

### List embeddingChunk records with pagination

```bash
csdk embedding-chunk list --limit 10 --offset 0
```

### List embeddingChunk records with cursor pagination

```bash
csdk embedding-chunk list --limit 10 --after <cursor>
```

### Find first matching embeddingChunk

```bash
csdk embedding-chunk find-first --where.id.equalTo <value>
```

### List embeddingChunk records with field selection

```bash
csdk embedding-chunk list --select id,id
```

### List embeddingChunk records with filtering and ordering

```bash
csdk embedding-chunk list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a embeddingChunk

```bash
csdk embedding-chunk create --tableId <UUID> [--databaseId <UUID>] [--embeddingFieldId <UUID>] [--chunksTableId <UUID>] [--chunksTableName <String>] [--contentFieldName <String>] [--dimensions <Int>] [--metric <String>] [--chunkSize <Int>] [--chunkOverlap <Int>] [--chunkStrategy <String>] [--metadataFields <JSON>] [--enqueueChunkingJob <Boolean>] [--chunkingTaskName <String>] [--parentFkFieldId <UUID>]
```

### Get a embeddingChunk by id

```bash
csdk embedding-chunk get --id <value>
```
