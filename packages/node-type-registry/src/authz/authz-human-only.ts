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
    properties: {},
    additionalProperties: false
  },
  tags: [
    'authz'
  ],
  summary: 'A limit: only a person signed in as themselves passes, not an agent key with its own identity.',
  use_when: [
    'Sensitive changes only a person may make, such as creating agent credentials, as a limit on top of the policy that grants access.'
  ],
  avoid_when: [
    'As the policy that grants access: it does not check the row.'
  ],
  risks: [
    'Used on its own as a grant, it lets every person signed in as themselves reach every row.'
  ]
};
