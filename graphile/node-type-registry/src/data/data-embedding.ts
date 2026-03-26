import type { NodeTypeDefinition } from '../types';

export const DataEmbedding: NodeTypeDefinition = {
  name: 'DataEmbedding',
  slug: 'data_embedding',
  category: 'data',
  display_name: 'Embedding',
  description: 'Adds a vector embedding column with HNSW or IVFFlat index for similarity search. Supports configurable dimensions, distance metrics (cosine, l2, ip), stale tracking strategies (column, null, hash), and automatic job enqueue triggers for embedding generation.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "field_name": {
          "type": "string",
          "description": "Name of the vector column",
          "default": "embedding"
        },
        "dimensions": {
          "type": "integer",
          "description": "Vector dimensions (e.g. 384, 768, 1536, 3072)",
          "default": 768
        },
        "index_method": {
          "type": "string",
          "enum": [
            "hnsw",
            "ivfflat"
          ],
          "description": "Index type for similarity search",
          "default": "hnsw"
        },
        "metric": {
          "type": "string",
          "enum": [
            "cosine",
            "l2",
            "ip"
          ],
          "description": "Distance metric (cosine, l2, ip)",
          "default": "cosine"
        },
        "index_options": {
          "type": "object",
          "description": "Index-specific options. HNSW: {m, ef_construction}. IVFFlat: {lists}.",
          "default": {}
        },
        "include_stale_field": {
          "type": "boolean",
          "description": "When stale_strategy is column, adds an embedding_stale boolean field",
          "default": true
        },
        "source_fields": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Column names that feed the embedding. Used by stale trigger to detect content changes."
        },
        "enqueue_job": {
          "type": "boolean",
          "description": "Auto-create trigger that enqueues embedding generation jobs",
          "default": true
        },
        "job_task_name": {
          "type": "string",
          "description": "Task identifier for the job queue",
          "default": "generate_embedding"
        },
        "stale_strategy": {
          "type": "string",
          "enum": [
            "column",
            "null",
            "hash"
          ],
          "description": "Strategy for tracking embedding staleness. column: embedding_stale boolean. null: set embedding to NULL. hash: md5 hash of source fields.",
          "default": "column"
        }
      }
    },
  tags: ['embedding', 'vector', 'ai', 'schema'],
};
