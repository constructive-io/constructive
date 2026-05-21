import { conditionDefs, triggerConditionsProperty } from '../conditions';
import type { NodeTypeDefinition } from '../types';

/**
 * File extraction processing node.
 *
 * Composes a JobTrigger that fires when a file transitions to status = 'uploaded'
 * (or on INSERT if confirm_upload is not enabled). The trigger enqueues a
 * text-extraction job that converts the file contents (PDF, DOCX, HTML, etc.)
 * into plain text or markdown, storing the result in configurable output fields.
 *
 * The extraction worker is external (Knative function) — this node only creates
 * the trigger infrastructure and output fields. The worker calls back into the
 * database to write extracted text and metadata.
 */
export const ProcessExtraction: NodeTypeDefinition = {
  name: 'ProcessExtraction',
  slug: 'process_extraction',
  category: 'process',
  display_name: 'File Extraction',
  description:
    'Creates extraction output fields and a job trigger for file text extraction. ' +
    'Fires when a file is uploaded (status = \'uploaded\') or on INSERT. ' +
    'The external worker extracts text/metadata from the file (PDF, DOCX, HTML, etc.) ' +
    'and writes the result back to the configured output fields. ' +
    'Typically used upstream of ProcessFileEmbedding or ProcessChunks.',
  parameter_schema: {
    type: 'object',
    $defs: conditionDefs,
    properties: {

      // ── Output fields ─────────────────────────────────────────────
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
      },

      // ── Model config (optional — flows into job payload) ──────────
      extraction_model: {
        type: 'string',
        description:
          'Extraction model identifier (e.g. a vision model for OCR, an LLM for ' +
          'structured extraction). Included in the job payload so the worker knows ' +
          'which model to use. When null, the worker falls back to runtime config.'
      },
      extraction_provider: {
        type: 'string',
        description:
          'Extraction provider name (e.g. "ollama", "openai"). ' +
          'When null, the worker falls back to runtime config.'
      },

      // ── MIME scoping ──────────────────────────────────────────────
      mime_patterns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'MIME type LIKE patterns to match. Multiple patterns are OR\'d together. ' +
          'Examples: [\'application/pdf\', \'text/%\'], [\'application/vnd.openxmlformats%\'].',
        default: ['application/pdf', 'text/%']
      },

      // ── Job routing ───────────────────────────────────────────────
      task_identifier: {
        type: 'string',
        description: 'Job task identifier for the extraction worker',
        default: 'extract_file_text'
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

      // ── Job options ───────────────────────────────────────────────
      queue_name: {
        type: 'string',
        description: 'Job queue name for extraction tasks',
        default: 'extraction'
      },
      max_attempts: {
        type: 'integer',
        description: 'Maximum number of retry attempts',
        default: 5
      },
      priority: {
        type: 'integer',
        description: 'Job priority (lower = higher priority)',
        default: 0
      }
    }
  },
  tags: [
    'extraction',
    'files',
    'processing',
    'jobs',
    'text'
  ]
};
