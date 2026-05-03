import type { NodeTypeDefinition } from '../types';

export const DataImageEmbedding: NodeTypeDefinition = {
  name: 'DataImageEmbedding',
  slug: 'data_image_embedding',
  category: 'data',
  display_name: 'Image Embedding',
  description: 'Composition wrapper that creates a vector embedding field with HNSW/IVFFlat index (via SearchVector) and a job trigger with compound conditions (via DataJobTrigger) that fires when image files transition to a ready status. Designed for tables with a status lifecycle and mime_type column (e.g., storage file tables).',
  parameter_schema: {
    type: 'object',
    properties: {
      field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the vector embedding column',
        default: 'embedding'
      },
      dimensions: {
        type: 'integer',
        description: 'Vector dimensions',
        default: 512
      },
      index_method: {
        type: 'string',
        enum: [
          'hnsw',
          'ivfflat'
        ],
        description: 'Index type for similarity search',
        default: 'hnsw'
      },
      metric: {
        type: 'string',
        enum: [
          'cosine',
          'l2',
          'ip'
        ],
        description: 'Distance metric',
        default: 'cosine'
      },
      task_identifier: {
        type: 'string',
        description: 'Job task identifier for the embedding worker',
        default: 'process_image_embedding'
      },
      status_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column that tracks the file upload lifecycle status',
        default: 'status'
      },
      status_ready_value: {
        type: 'string',
        description: 'Value of status_field indicating the file is ready for processing',
        default: 'ready'
      },
      status_pending_value: {
        type: 'string',
        description: 'Value of status_field indicating the file is still pending (used in OLD row check)',
        default: 'pending'
      },
      mime_patterns: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'MIME type LIKE patterns to match (e.g., image/%, video/%). Multiple patterns are OR\'d together.',
        default: ['image/%']
      },
      payload_custom: {
        type: 'object',
        additionalProperties: {
          type: 'string'
        },
        description: 'Custom payload key-to-column mapping for the job trigger',
        default: {
          file_id: 'id',
          key: 'key',
          mime_type: 'mime_type',
          bucket_id: 'bucket_id'
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
