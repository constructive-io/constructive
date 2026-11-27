import type { NodeTypeDefinition } from '../types';

export const AuthzOrgHierarchy: NodeTypeDefinition = {
  name: 'AuthzOrgHierarchy',
  slug: 'authz_org_hierarchy',
  category: 'authz',
  display_name: 'Org Hierarchy',
  description: 'Organizational hierarchy visibility using closure table. Managers can see subordinate data or subordinates can see manager data.',
  parameter_schema: {
    type: 'object',
    properties: {
      direction: {
        type: 'string',
        enum: [
          'up',
          'down'
        ],
        description: 'down=manager sees subordinates, up=subordinate sees managers'
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Field referencing the org entity',
        default: 'entity_id'
      },
      anchor_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: 'Field referencing the user (e.g., owner_id)'
      },
      max_depth: {
        type: 'integer',
        description: 'Optional max depth to limit visibility'
      },
      sprt_schema: {
        type: 'string',
        readOnly: true,
        description: 'The schema of the reporting chart the policy reads, which the backend resolves.'
      },
      sprt_table: {
        type: 'string',
        readOnly: true,
        description: 'The reporting chart the policy reads, which the backend resolves.'
      }
    },
    required: [
      'direction',
      'anchor_field'
    ],
    additionalProperties: false
  },
  tags: [
    'membership',
    'hierarchy',
    'authz'
  ],
  summary: 'People above or below the row\'s person in the organization\'s reporting chart get access.',
  use_when: [
    'Managers who must see the work of the people below them.'
  ],
  avoid_when: [
    'Rows every member of the organization may see: use AuthzEntityMembership.'
  ],
  risks: [
    'The database needs the hierarchy module; without it the policy fails to build.'
  ]
};
