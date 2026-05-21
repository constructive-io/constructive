import { conditionDefs, triggerConditionsProperty } from '../conditions';
import type { NodeTypeDefinition } from '../types';

/**
 * Image-specific preset of ProcessFileEmbedding.
 *
 * At the SQL layer, data_image_embedding delegates entirely to
 * data_file_embedding, merging image-specific defaults before forwarding.
 * The parameter schema here is intentionally identical to ProcessFileEmbedding;
 * only the defaults differ (dimensions: 512, task: process_image_embedding,
 * mime_patterns: ['image/%']).
 *
 * Kept as a separate node type for backward compatibility — existing
 * blueprints that reference ProcessImageEmbedding continue to work unchanged.
 */
export const ProcessImageEmbedding: NodeTypeDefinition = {
  name: 'ProcessImageEmbedding',
  slug: 'data_image_embedding',
  category: 'process',
  display_name: 'Image Embedding',
  description:
    'Image-specific preset of ProcessFileEmbedding. Delegates to ProcessFileEmbedding ' +
    'with image-oriented defaults: dimensions=512 (CLIP), mime_patterns=[\'image/%\'], ' +
    'task_identifier=\'process_image_embedding\', direct mode (no extraction). ' +
    'Accepts all ProcessFileEmbedding parameters — any overrides are forwarded through.',
  parameter_schema: {
    type: 'object',
    $defs: conditionDefs,
    properties: {

      // ── Vector config (passed through to ProcessFileEmbedding) ──────────
      field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the vector embedding column',
        default: 'embedding'
      },
      dimensions: {
        type: 'integer',
        description: 'Vector dimensions (default 512 for CLIP-style image embeddings)',
        default: 512
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

      // ── Model config (optional — flows into job payload) ──────────
      embedding_model: {
        type: 'string',
        description:
          'Embedding model identifier (e.g. "clip-vit-base-patch32"). ' +
          'Included in the job payload so the worker knows which model to use. ' +
          'When null, the worker falls back to runtime config (llm_module / env vars).'
      },
      embedding_provider: {
        type: 'string',
        description:
          'Embedding provider name (e.g. "ollama", "openai"). ' +
          'When null, the worker falls back to runtime config.'
      },

      // ── MIME scoping ───────────────────────────────────────────────
      mime_patterns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'MIME type LIKE patterns to match. Multiple patterns are OR\'d together.',
        default: ['image/%']
      },

      // ── Job routing ────────────────────────────────────────────────
      task_identifier: {
        type: 'string',
        description: 'Job task identifier for the image embedding worker',
        default: 'process_image_embedding'
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
      trigger_conditions: triggerConditionsProperty,

      // ── Extraction config (optional — enables extract mode) ────────
      extraction: {
        type: 'object',
        description:
          'Text extraction configuration. Forwarded to ProcessFileEmbedding. ' +
          'When present, enables extract mode (e.g., OCR for images).',
        properties: {
          text_field: {
            type: 'string',
            format: 'column-ref',
            description: 'Field to store extracted text',
            default: 'extracted_text'
          },
          metadata_field: {
            type: 'string',
            format: 'column-ref',
            description: 'JSONB field for extraction metadata',
            default: 'extracted_metadata'
          }
        }
      },

      // ── Chunking config (optional — forwarded to ProcessFileEmbedding) ─
      chunks: {
        type: 'object',
        description:
          'Chunking configuration. Forwarded to ProcessFileEmbedding. ' +
          'Only meaningful when extraction is also provided.',
        properties: {
          content_field_name: {
            type: 'string',
            format: 'column-ref',
            default: 'content'
          },
          chunk_size: { type: 'integer', default: 1000 },
          chunk_overlap: { type: 'integer', default: 200 },
          chunk_strategy: {
            type: 'string',
            enum: ['fixed', 'sentence', 'paragraph', 'semantic'],
            default: 'paragraph'
          },
          metadata_fields: { type: 'object' },
          enqueue_chunking_job: { type: 'boolean', default: true },
          chunking_task_name: { type: 'string', default: 'generate_chunks' }
        }
      }
    }
  },
  tags: [
    'embedding',
    'image',
    'vector',
    'ai',
    'composition',
    'jobs'
  ]
};
