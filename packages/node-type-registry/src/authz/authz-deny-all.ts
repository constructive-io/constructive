import type { NodeTypeDefinition } from '../types';

export const AuthzDenyAll: NodeTypeDefinition = {
  name: 'AuthzDenyAll',
  slug: 'authz_deny_all',
  category: 'authz',
  display_name: 'No Access',
  description: 'Denies all access. Generates FALSE expression.',
  parameter_schema: {
    type: 'object',
    properties: {}
  },
  tags: [
    'authz'
  ]
};
