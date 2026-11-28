import { conditionDefs, triggerConditionsProperty } from '../conditions';
import type { NodeTypeDefinition } from '../types';

/**
 * Image version processing node.
 *
 * Composes a JobTrigger for image variant generation. On a storage module's
 * files table it also creates the jsonb column the variants manifest is
 * written back to (`versions_field`, default `image_versions`); on a business
 * table with an upload/image column the manifest is written inside that
 * column's own document, as its `versions` member. On a storage module's files table the trigger fires when
 * the file transitions to status = 'uploaded'; on a business table with an
 * upload/image column it fires on the configured events (INSERT by default,
 * plus an UPDATE that changes the file when no events are given).
 *
 * The trigger enqueues `image:process_image_versions`, which `functions/image`
 * answers: it reads the source object from the row's own bucket, renders each
 * version, writes the variants beside the source
 * (`<key>.versions/<name>-<spec hash>.<ext>`) and lands the manifest — an
 * array, narrowest first, of each variant's name, object key, format,
 * dimensions and size — on the row. `versions` is optional: without it the
 * worker resolves the ladder when the job runs (the `IMAGE_VERSIONS` config
 * value, else thumbnail 160x160 cover and 320 / 640 / 1280 / 1920 wide, WebP),
 * so nothing is stamped into the trigger. A version wider or taller than the
 * source is skipped, never upscaled. SVG sources are left alone unless
 * `mime_patterns` is given. On a storage module's files table the generator also emits
 * `<files>_write_image_versions`, the SECURITY DEFINER writer that lands the
 * manifest and moves the file `uploaded → processed`.
 */
export const ProcessImageVersions: NodeTypeDefinition = {
  name: 'ProcessImageVersions',
  slug: 'process_image_versions',
  category: 'process',
  display_name: 'Image Versions',
  description:
    'Creates a job trigger for image variant generation. ' +
    'On a storage files table it fires when the file reaches status = \'uploaded\'; ' +
    'on a business table with a file column it fires on INSERT and on an UPDATE that changes the file; events, when given, replace that default. ' +
    'The image worker generates resized, cropped, or reformatted versions ' +
    '(thumbnails, previews, WebP conversions, etc.), stores them beside the source object ' +
    'in the file\'s own bucket, and records each variant\'s name, key, format, dimensions and size: ' +
    'inside the file column\'s own document (its versions member) on a business table, ' +
    'in the manifest column on a storage files table. ' +
    'With no versions given the worker uses the default ladder (thumbnail, small, medium, large, xlarge), ' +
    'resolved when the job runs, and skips any version larger than the source.',
  parameter_schema: {
    type: 'object',
    $defs: conditionDefs,
    properties: {

      // ── Version definitions ───────────────────────────────────────
      versions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Version identifier (e.g., "thumb", "preview", "hero")'
            },
            width: {
              type: 'integer',
              description: 'Target width in pixels'
            },
            height: {
              type: 'integer',
              description: 'Target height in pixels'
            },
            fit: {
              type: 'string',
              enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
              description: 'Resize fitting strategy',
              default: 'cover'
            },
            format: {
              type: 'string',
              enum: ['jpeg', 'png', 'webp', 'avif'],
              description: 'Output image format',
              default: 'webp'
            },
            quality: {
              type: 'integer',
              description: 'Output quality (1-100)',
              default: 80
            }
          },
          required: ['name']
        },
        description:
          'Array of version definitions. Each version specifies dimensions, ' +
          'format, and quality for a generated image variant. ' +
          'Optional: when omitted the worker resolves the default ladder at job time ' +
          '(thumbnail 160x160 cover, then small 320, medium 640, large 1280 and xlarge 1920 wide, WebP quality 80), ' +
          'so a later change to the default reaches tables already provisioned. ' +
          'A version larger than the source is skipped rather than upscaled.',
        minItems: 1
      },

      // ── Output field ──────────────────────────────────────────────
      versions_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Files tables only: name of the jsonb column the variants manifest is written to. Created by the generator when absent; ' +
          'forwarded to the worker in the job payload. Rejected with file_field, where the manifest is written inside the file document.',
        default: 'image_versions'
      },

      // ── MIME scoping ──────────────────────────────────────────────
      mime_patterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'MIME type LIKE patterns to match. Defaults to all image types except image/svg+xml, which is not rasterized unless a pattern given here asks for it.',
        default: ['image/%']
      },

      // ── Job routing ───────────────────────────────────────────────
      task_identifier: {
        type: 'string',
        format: 'function-ref',
        description: 'Job task identifier for the image processing worker',
        default: 'image:process_image_versions'
      },
      events: {
        type: 'array',
        items: { type: 'string', enum: ['INSERT', 'UPDATE'] },
        description:
          'Trigger events that fire the job on a business table. Ignored on a storage ' +
          'files table, where the trigger is always the status transition to uploaded ' +
          '(INSERT is rejected there: the row is still requested).',
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
          'The column may be an array (image[]/upload[]): the lane then runs once per element whose key is new to the array, and each element carries its own manifest in its versions member.'
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
      },

      // ── Job options ───────────────────────────────────────────────
      queue_name: {
        type: 'string',
        description: 'Job queue name for image processing tasks',
        default: 'image_processing'
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
    'images',
    'processing',
    'jobs',
    'resize',
    'thumbnails',
    'files'
  ]
};
