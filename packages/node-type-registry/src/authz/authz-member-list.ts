import type { NodeTypeDefinition } from '../types';

export const AuthzMemberList: NodeTypeDefinition = {
  name: 'AuthzMemberList',
  slug: 'authz_member_list',
  category: 'authz',
  display_name: 'Member List',
  description: 'Check if current user is in an array column on the same row.',
  parameter_schema: {
    type: 'object',
    properties: {
      array_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Column name containing the array of user IDs'
      }
    },
    required: [
      'array_field'
    ],
    additionalProperties: false
  },
  tags: [
    'ownership',
    'authz'
  ],
  summary: 'People whose id is listed in a list column of the row get access.',
  use_when: [
    'Small share lists kept on the row itself.'
  ],
  avoid_when: [
    'Large or changing groups: a team membership is easier to keep correct.'
  ],
  risks: [
    'Anyone who may update the row can add or remove people from the list, unless the column is guarded.',
    'Access does not end when a person leaves the team or the app.'
  ]
};
