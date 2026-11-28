import { conditionDefs, triggerConditionsProperty } from '../conditions';
import type { NodeTypeDefinition } from '../types';

/**
 * Image-specific preset of ProcessFileEmbedding.
 *
 * At the SQL layer, data_image_embedding delegates entirely to
 * data_file_embedding, merging image-specific defaults before forwarding.
 * The parameter schema is ProcessFileEmbedding's minus extraction/chunks — it
 * is direct mode only until an OCR worker exists — and the defaults differ
 * (dimensions: 512, mime_patterns: ['image/%']). The
 * task is the same file-shaped record worker, embedding:process_file_embedding:
 * the trigger payload is the file row's columns (file_id, key, mime_type,
 * bucket_id), which embedding:process_image_embedding — the flow function that
 * embeds an {image_url, alt_text} it is handed — does not accept.
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
    'task_identifier=\'embedding:process_file_embedding\', direct mode only: there is no ' +
    'image extraction (OCR) worker, so extraction is refused. Every other parameter is forwarded through.',
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
        format: 'function-ref',
        description:
          'Job task identifier for the image embedding worker. The payload is the file ' +
          'row (file_id, key, mime_type, bucket_id), so the task must be a record worker ' +
          'that reads the object itself — not embedding:process_image_embedding, which ' +
          'embeds an image_url it is handed.',
        default: 'embedding:process_file_embedding'
      },
      events: {
        type: 'array',
        items: { type: 'string', enum: ['INSERT', 'UPDATE'] },
        description: 'Trigger events that fire the job',
        default: ['INSERT']
      },
      file_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Name of an upload/image domain column holding the file reference. ' +
          'When set, the trigger reads the object key, MIME type and bucket id ' +
          'out of that document (NEW.<file_field> ->> \'key\', ...) instead of ' +
          'requiring key/mime_type/bucket_id columns beside it, and the MIME ' +
          'patterns match against <file_field> ->> \'mime\'. ' +
          'An array column (image[]/upload[]) is refused (PROCESS_IMAGE_EMBEDDING_ARRAY_FILE_FIELD_UNSUPPORTED): one vector column cannot hold a vector per element.'
      },
      payload_custom: {
        type: 'object',
        additionalProperties: {
          oneOf: [
            { type: 'string', format: 'column-ref' },
            {
              type: 'object',
              properties: {
                field: { type: 'string', format: 'column-ref' },
                path: { type: 'array', items: { type: 'string' }, minItems: 1 }
              },
              required: ['field', 'path']
            }
          ]
        },
        description:
          'Custom payload key-to-source mapping for the job trigger. A source is ' +
          'either a column name or a read into a jsonb column ' +
          '({"field": "upload", "path": ["key"]}). Defaults to the four file ' +
          'columns, or to the file_field document when file_field is set.'
      },
      trigger_conditions: triggerConditionsProperty,

      // ── Entity billing scope ──────────────────────────────────────
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column on the trigger table that holds (or references) the entity_id for billing scope. Forwarded to the composed JobTrigger.'
      },
      entity_lookup: {
        type: 'object',
        description: 'FK lookup configuration for resolving entity_id through a related table. Forwarded to the composed JobTrigger.',
        properties: {
          obj_table: { type: 'string', description: 'Name of the related table to look up entity_id from' },
          obj_schema: { type: 'string', description: 'Schema of the related table (user-facing name, optional)' },
          obj_field: { type: 'string', format: 'column-ref', description: 'Column on the related table that holds the entity_id' }
        },
        required: ['obj_table', 'obj_field']
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
