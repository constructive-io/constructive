import type { NodeTypeDefinition } from '../types';

/**
 * Standalone chunking node type.
 *
 * Creates an embedding_chunks record that provisions a chunks table with:
 * - FK to parent table (CASCADE delete)
 * - content text field
 * - chunk_index integer field
 * - embedding vector(N) field with HNSW index
 * - metadata jsonb field
 * - RLS policies inherited from parent
 * - Optional job trigger for automatic chunking on INSERT/UPDATE
 *
 * This node is also composed internally by ProcessFileEmbedding (enabled by
 * default in extract mode). Use it standalone when you want a chunks table
 * without the full file-embedding pipeline.
 */
export const ProcessChunks: NodeTypeDefinition = {
  name: 'ProcessChunks',
  slug: 'data_chunks',
  category: 'process',
  display_name: 'Chunks',
  description:
    'Creates a chunked-embedding child table for any parent table. ' +
    'Provisions the chunks table with content, chunk_index, embedding vector, ' +
    'metadata, HNSW index, inherited RLS, and optional job trigger for ' +
    'automatic text splitting. Composed internally by ProcessFileEmbedding ' +
    '(enabled by default in extract mode) but can also be used standalone.',
  parameter_schema: {
    type: 'object',
    properties: {

      // ── Content config ─────────────────────────────────────────────
      content_field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the text content column in the chunks table',
        default: 'content'
      },

      // ── Chunking strategy ──────────────────────────────────────────
      chunk_size: {
        type: 'integer',
        description: 'Maximum number of characters per chunk',
        default: 1000
      },
      chunk_overlap: {
        type: 'integer',
        description: 'Number of overlapping characters between consecutive chunks',
        default: 200
      },
      chunk_strategy: {
        type: 'string',
        enum: ['fixed', 'sentence', 'paragraph', 'semantic'],
        description: 'Strategy for splitting text into chunks',
        default: 'paragraph'
      },

      // ── Embedding config ───────────────────────────────────────────
      dimensions: {
        type: 'integer',
        description: 'Vector dimensions for per-chunk embeddings',
        default: 768
      },
      metric: {
        type: 'string',
        enum: ['cosine', 'l2', 'ip'],
        description: 'Distance metric for the HNSW index on chunk embeddings',
        default: 'cosine'
      },

      // ── Model config (optional — flows into job payload) ──────────
      embedding_model: {
        type: 'string',
        description:
          'Embedding model identifier for per-chunk embeddings. ' +
          'When null, the worker falls back to runtime config (llm_module / env vars).'
      },
      embedding_provider: {
        type: 'string',
        description:
          'Embedding provider name (e.g. "ollama", "openai"). ' +
          'When null, the worker falls back to runtime config.'
      },

      // ── Table naming ───────────────────────────────────────────────
      chunks_table_name: {
        type: 'string',
        description:
          'Override the chunks table name. Defaults to {parent_table}_chunks.',
      },

      // ── Metadata ───────────────────────────────────────────────────
      metadata_fields: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Field names from the parent table to copy into chunk metadata'
      },

      // ── Search indexes ───────────────────────────────────────────────
      search_indexes: {
        type: 'array',
        items: { type: 'string', enum: ['fulltext', 'bm25', 'trigram'] },
        description:
          'Text search indexes to create on the chunks content column. ' +
          'Omit to mirror the parent table\'s text search indexes. ' +
          'Set explicitly to override (e.g. ["fulltext", "bm25"]).'
      },

      // ── Job trigger ────────────────────────────────────────────────
      enqueue_chunking_job: {
        type: 'boolean',
        description:
          'Whether to create a job trigger that auto-enqueues chunking ' +
          'on parent INSERT/UPDATE',
        default: true
      },
      chunking_task_name: {
        type: 'string',
        description: 'Task identifier for the chunking job queue',
        default: 'generate_chunks'
      }
    }
  },
  tags: [
    'embedding',
    'chunks',
    'vector',
    'ai',
    'rag'
  ]
};
