import type { NodeTypeDefinition } from '../types';

export const DataPublishable: NodeTypeDefinition = {
  name: 'DataPublishable',
  slug: 'data_publishable',
  category: 'data',
  display_name: 'Publishable',
  description: 'Adds publish state columns (is_published, published_at) for content visibility. Enables AuthzPublishable and AuthzTemporal authorization.',
  parameter_schema: {
    type: 'object',
    properties: {
      is_published_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the published boolean flag',
        default: 'is_published'
      },
      published_at_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the publish timestamp',
        default: 'published_at'
      },
      include_id: {
        type: 'boolean',
        description: 'If true, also adds a UUID primary key column with auto-generation',
        default: true
      }
    }
  },
  tags: [
    'publishing',
    'temporal',
    'schema'
  ]
};
