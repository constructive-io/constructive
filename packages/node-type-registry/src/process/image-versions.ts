import { conditionDefs, triggerConditionsProperty } from '../conditions';
import type { NodeTypeDefinition } from '../types';

/**
 * Image version processing node.
 *
 * Composes a JobTrigger that fires when an image file transitions to
 * status = 'uploaded' (or on INSERT if confirm_upload is not enabled).
 * The trigger enqueues an image-processing job that generates resized,
 * cropped, or reformatted variants of the source image.
 *
 * The image processing worker is external (Knative function) — this node
 * only creates the trigger infrastructure. The worker generates the variants
 * and writes them back to the storage system as new file records linked to
 * the source file.
 */
export const ProcessImageVersions: NodeTypeDefinition = {
  name: 'ProcessImageVersions',
  slug: 'process_image_versions',
  category: 'process',
  display_name: 'Image Versions',
  description:
    'Creates a job trigger for image variant generation. ' +
    'Fires when an image file is uploaded (status = \'uploaded\') or on INSERT. ' +
    'The external worker generates resized, cropped, or reformatted versions ' +
    '(thumbnails, previews, WebP conversions, etc.) and stores them as new ' +
    'file records linked to the source image.',
  parameter_schema: {
    type: 'object',
    $defs: conditionDefs,
    required: ['versions'],
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
          'Required — the blueprint must explicitly define what variants to generate.',
        minItems: 1
      },

      // ── MIME scoping ──────────────────────────────────────────────
      mime_patterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'MIME type LIKE patterns to match. Defaults to all image types.',
        default: ['image/%']
      },

      // ── Job routing ───────────────────────────────────────────────
      task_identifier: {
        type: 'string',
        description: 'Job task identifier for the image processing worker',
        default: 'process_image_versions'
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
