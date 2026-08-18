import type { NodeTypeDefinition } from '../types';

export const AuthzHumanOnly: NodeTypeDefinition = {
  name: 'AuthzHumanOnly',
  slug: 'authz_human_only',
  category: 'authz',
  display_name: 'Human Session Only',
  description:
    "Passes only for human sessions: compares the session's principal claim to its user claim, so service principals (API keys, agents) are excluded. Typically applied as a restrictive policy alongside a permissive membership policy.",
  parameter_schema: {
    type: 'object',
    properties: {}
  },
  tags: [
    'authz'
  ]
};
