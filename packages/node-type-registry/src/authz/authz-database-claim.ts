import type { NodeTypeDefinition } from '../types';

export const AuthzDatabaseClaim: NodeTypeDefinition = {
  name: 'AuthzDatabaseClaim',
  slug: 'authz_database_claim',
  category: 'authz',
  display_name: 'Session Database Claim',
  description:
    "Passes when the row's database column equals the session's pinned database claim (jwt.claims.database_id). " +
    'Consults no principal, membership or entity, so it admits a connection whose identity the platform sets — ' +
    "such as a cloud function's database connection, whose claim comes from the connection and cannot widen it — " +
    'to exactly the database that connection is bound to. A session with no claim fails loudly rather than reading nothing.',
  parameter_schema: {
    type: 'object',
    properties: {
      entity_field: {
        type: 'string',
        format: 'column-ref',
        'x-column-scope': 'local',
        description: "Column carrying the row's database id",
        default: 'database_id'
      },
      schema_id: {
        type: 'string',
        format: 'uuid',
        description: 'A schema whose database must be the claimed one, in place of a column; the rule then reads no column.'
      },
      lane_attested: {
        type: 'boolean',
        description: 'Only connections the platform attests for the claimed database pass.',
        default: false
      }
    },
    additionalProperties: false
  },
  tags: ['authz', 'infrastructure'],
  summary: 'Connections the platform binds to one database reach that database\'s rows; it checks no person or team.',
  use_when: [
    'Rows that a cloud function\'s database connection must reach for its own database.'
  ],
  avoid_when: [
    'Rows people reach through the API: use a membership policy.'
  ],
  risks: [
    'Every session the platform binds to that database passes, including an API key used through the database connection proxy.'
  ]
};
