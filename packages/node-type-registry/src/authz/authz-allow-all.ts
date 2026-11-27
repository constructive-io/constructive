import type { NodeTypeDefinition } from '../types';

export const AuthzAllowAll: NodeTypeDefinition = {
  name: 'AuthzAllowAll',
  slug: 'authz_allow_all',
  category: 'authz',
  display_name: 'Public Access',
  description: 'Allows all access. Generates TRUE expression.',
  parameter_schema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  tags: [
    'authz'
  ],
  summary: 'Anyone who can use the table gets every row, with no check.',
  use_when: [
    'Reference data that every signed-in person may read, such as a list of countries.'
  ],
  avoid_when: [
    'Any operation that changes rows: anyone who can use the table could change or delete every row.'
  ],
  risks: [
    'On create, update or delete it lets anyone who can use the table change every row.'
  ]
};
