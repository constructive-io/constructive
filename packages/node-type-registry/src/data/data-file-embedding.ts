import type { NodeTypeDefinition } from '../types';

export const DataFileEmbedding: NodeTypeDefinition = {
  name: 'DataFileEmbedding',
  slug: 'data_file_embedding',
  category: 'data',
  display_name: 'File Embedding',
  description:
    'Generic, MIME-scoped embedding node for file tables. Supports two modes: ' +
    'direct (whole-file to single vector, e.g. CLIP for images) when extraction ' +
    'is omitted, or extract (file to text to chunks to per-chunk vectors) when ' +
    'extraction config is provided. Composes SearchVector + DataJobTrigger + ' +
    'DataChunks (enabled by default in extract mode) internally. Multiple ' +
    'instances can coexist on the same table with different MIME scopes, field ' +
    'names, and embedding strategies.',
  parameter_schema: {
    type: 'object',
    properties: {

      // ── Vector config (passed through to SearchVector) ─────────────
      field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the vector embedding column',
        default: 'embedding'
      },
      dimensions: {
        type: 'integer',
        description: 'Vector dimensions (e.g. 512 for CLIP, 768 for nomic, 1536 for ada-002)',
        default: 768
      },
      index_method: {
        type: 'string',
        enum: ['hnsw', 'ivfflat'],
        description: 'Index type for similarity search',
        default: 'hnsw'
      },
      metric: {
        type: 'string',
        enum: ['cosine', 'l2', 'ip'],
        description: 'Distance metric',
        default: 'cosine'
      },
      index_options: {
        type: 'object',
        description: 'Index-specific options. HNSW: {m, ef_construction}. IVFFlat: {lists}.',
        default: {}
      },

      // ── MIME scoping ───────────────────────────────────────────────
      mime_patterns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'MIME type LIKE patterns to match. Multiple patterns are OR\'d together. ' +
          'Examples: [\'image/%\'], [\'application/pdf\', \'text/%\'], [\'audio/%\'].',
        default: ['image/%']
      },

      // ── Job routing ────────────────────────────────────────────────
      task_identifier: {
        type: 'string',
        description:
          'Job task identifier for the worker. In direct mode this is the ' +
          'embedding worker; in extract mode this is the extraction worker.',
        default: 'process_file_embedding'
      },
      events: {
        type: 'array',
        items: { type: 'string', enum: ['INSERT', 'UPDATE'] },
        description: 'Trigger events that fire the job',
        default: ['INSERT']
      },
      payload_custom: {
        type: 'object',
        additionalProperties: { type: 'string', format: 'column-ref' },
        description: 'Custom payload key-to-column mapping for the job trigger',
        default: {
          file_id: 'id',
          key: 'key',
          mime_type: 'mime_type',
          bucket_id: 'bucket_id'
        }
      },
      trigger_conditions: {
        description:
          'Additional compound conditions beyond MIME filtering. ' +
          'Merged with the auto-generated MIME conditions via AND. ' +
          'Use this to add status checks, field guards, etc.',
        'x-codegen-type': 'TriggerCondition | TriggerCondition[]',
        oneOf: [
          { $ref: '#/$defs/triggerCondition' },
          { type: 'array', items: { $ref: '#/$defs/triggerCondition' } }
        ]
      },

      // ── Extraction config (optional — enables extract mode) ────────
      extraction: {
        type: 'object',
        description:
          'Text extraction configuration. When present, the generator creates ' +
          'extraction output fields on the table and configures SearchVector with ' +
          'source_fields + stale tracking. When absent, the node operates in direct ' +
          'mode (single vector per file, no text extraction).',
        properties: {
          text_field: {
            type: 'string',
            format: 'column-ref',
            description: 'Field to store extracted text/markdown',
            default: 'extracted_text'
          },
          metadata_field: {
            type: 'string',
            format: 'column-ref',
            description: 'JSONB field for extraction metadata (page count, language, etc.)',
            default: 'extracted_metadata'
          }
        }
      },

      // ── Chunking (enabled by default in extract mode) ──────────────
      include_chunks: {
        type: 'boolean',
        description:
          'Whether to create a chunks table via DataChunks. Defaults to true ' +
          'when extraction is provided, false in direct mode. Set explicitly ' +
          'to override.',
      },
      chunks: {
        type: 'object',
        description:
          'Chunking configuration passed through to DataChunks. When ' +
          'include_chunks is true (or defaults to true in extract mode), these ' +
          'params configure the chunks table, embedding dimensions, strategy, etc.',
        properties: {
          content_field_name: {
            type: 'string',
            format: 'column-ref',
            description: 'Name of the text content column in the chunks table',
            default: 'content'
          },
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
          metadata_fields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Field names from parent to copy into chunk metadata'
          },
          enqueue_chunking_job: {
            type: 'boolean',
            description: 'Whether to auto-enqueue a chunking job on insert/update',
            default: true
          },
          chunking_task_name: {
            type: 'string',
            description: 'Task identifier for the chunking job queue',
            default: 'generate_chunks'
          }
        }
      }
    }
  },
  tags: [
    'embedding',
    'vector',
    'ai',
    'composition',
    'jobs',
    'multimodal',
    'files'
  ]
};
