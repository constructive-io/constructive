import type { NodeTypeDefinition } from '../types';

export const SearchVector: NodeTypeDefinition = {
  "name": "SearchVector",
  "slug": "search_vector",
  "category": "search",
  "display_name": "Vector Search",
  "description": "Adds a vector embedding column with HNSW or IVFFlat index for similarity search. Supports configurable dimensions, distance metrics (cosine, l2, ip), stale tracking strategies (column, null, hash), and automatic job enqueue triggers for embedding generation.",
  "parameter_schema": {
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
      },
      "chunks": {
        "type": "object",
        "description": "Chunking configuration for long-text embedding. Creates an embedding_chunks record that drives automatic text splitting and per-chunk embedding. Omit to skip chunking.",
        "properties": {
          "content_field_name": {
            "type": "string",
            "description": "Name of the text content column in the chunks table",
            "default": "content"
          },
          "chunk_size": {
            "type": "integer",
            "description": "Maximum number of characters per chunk",
            "default": 1000
          },
          "chunk_overlap": {
            "type": "integer",
            "description": "Number of overlapping characters between consecutive chunks",
            "default": 200
          },
          "chunk_strategy": {
            "type": "string",
            "enum": [
              "fixed",
              "sentence",
              "paragraph",
              "semantic"
            ],
            "description": "Strategy for splitting text into chunks",
            "default": "fixed"
          },
          "metadata_fields": {
            "type": "object",
            "description": "Metadata fields from parent to copy into chunks"
          },
          "enqueue_chunking_job": {
            "type": "boolean",
            "description": "Whether to auto-enqueue a chunking job on insert/update",
            "default": true
          },
          "chunking_task_name": {
            "type": "string",
            "description": "Task identifier for the chunking job queue",
            "default": "generate_chunks"
          }
        }
      }
    }
  },
  "tags": [
    "embedding",
    "vector",
    "ai",
    "schema"
  ]
};
