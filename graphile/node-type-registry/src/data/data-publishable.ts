import type { NodeTypeDefinition } from '../types';

export const DataPublishable: NodeTypeDefinition = {
  name: 'DataPublishable',
  slug: 'data_publishable',
  category: 'data',
  display_name: 'Publishable',
  description: 'Adds publish state columns (is_published, published_at) for content visibility. Enables AuthzPublishable and AuthzTemporal authorization.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "include_id": {
          "type": "boolean",
          "description": "If true, also adds a UUID primary key column with auto-generation",
          "default": true
        }
      }
    },
  tags: ['publishing', 'temporal', 'schema'],
};
