import type { NodeTypeDefinition } from '../types';

export const DataBulk: NodeTypeDefinition = {
  name: 'DataBulk',
  slug: 'data_bulk',
  category: 'data',
  display_name: 'Bulk Operations',
  description:
    'Enables bulk mutation smart tags on a table. When provisioned, adds @behavior tags for the selected bulk operations (insert, upsert, update, delete). Requires the graphile-bulk-mutations plugin.',
  parameter_schema: {
    type: 'object',
    properties: {
      insert: {
        type: 'boolean',
        description: 'Enable bulk insert (+bulkInsert)',
        default: true
      },
      upsert: {
        type: 'boolean',
        description: 'Enable bulk upsert (+bulkUpsert)',
        default: false
      },
      update: {
        type: 'boolean',
        description: 'Enable bulk update (+bulkUpdate)',
        default: false
      },
      delete: {
        type: 'boolean',
        description: 'Enable bulk delete (+bulkDelete)',
        default: false
      }
    }
  },
  tags: [
    'bulk',
    'mutations',
    'graphile'
  ]
};
