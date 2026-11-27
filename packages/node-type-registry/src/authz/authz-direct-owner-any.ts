import type { NodeTypeDefinition } from '../types';
import { AGENT_IDENTITY_RISK } from './plain-words';

export const AuthzDirectOwnerAny: NodeTypeDefinition = {
  name: 'AuthzDirectOwnerAny',
  slug: 'authz_direct_owner_any',
  category: 'authz',
  display_name: 'Multi-Owner Access',
  description: 'OR logic for multiple ownership fields. Checks if current user matches any of the specified fields.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref',
          'x-column-scope': 'local'
        },
        minItems: 1,
        description: 'Array of column names to check for ownership'
      }
    },
    required: [
      'entity_fields'
    ],
    additionalProperties: false
  },
  tags: [
    'ownership',
    'authz'
  ],
  summary: 'Anyone whose id is in one of the row\'s listed owner columns gets access, with no check on team or app membership.',
  use_when: [
    'A row with two or more people on it, such as the sender and the receiver of a message.'
  ],
  avoid_when: [
    'Rows that belong to a team or the app: fence each owner column with AuthzMemberOwner or AuthzAppMemberOwner.'
  ],
  risks: [
    'Access does not end when a person leaves the team or the app, or is banned.',
    AGENT_IDENTITY_RISK
  ]
};
