import type { NodeTypeDefinition } from '../types';

export const AuthzPublishable: NodeTypeDefinition = {
  name: 'AuthzPublishable',
  slug: 'authz_publishable',
  category: 'authz',
  display_name: 'Published Content',
  description: 'Published state access control. Restricts access to records that are published.',
  parameter_schema: {
    type: 'object',
    properties: {
      is_published_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Boolean field indicating published state',
        default: 'is_published'
      },
      published_at_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Timestamp field for publish time',
        default: 'published_at'
      },
      require_published_at: {
        type: 'boolean',
        description: 'Require published_at to be non-null and <= now()',
        default: true
      }
    },
    additionalProperties: false
  },
  tags: [
    'temporal',
    'publishing',
    'authz'
  ],
  summary: 'Anyone who can use the table can read rows once they are published; it does not check who is asking.',
  use_when: [
    'Read access to posts or pages that everyone may see once they are published. Use it for read only.'
  ],
  avoid_when: [
    'Create, update or delete: anyone who can use the table could change every published row.'
  ],
  risks: [
    'With the usual grant to signed-in people, every signed-in person can read every published row, even people outside the team or the app.'
  ]
};
