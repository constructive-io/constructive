import type { NodeTypeDefinition } from '../types';

export const AuthzDenyAll: NodeTypeDefinition = {
  name: 'AuthzDenyAll',
  slug: 'authz_deny_all',
  category: 'authz',
  display_name: 'No Access',
  description: 'Denies all access. Generates FALSE expression.',
  parameter_schema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  tags: [
    'authz'
  ],
  summary: 'Nobody gets access through this policy.',
  use_when: [
    'Closing an operation, such as delete, on a table where no other policy covers that operation.'
  ],
  risks: [
    'It blocks nothing by itself: when another policy covers the same operation, that policy still lets people in.'
  ]
};
