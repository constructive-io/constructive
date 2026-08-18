import type { NodeTypeDefinition } from '../types';

export const AuthzDatabaseClaim: NodeTypeDefinition = {
  name: 'AuthzDatabaseClaim',
  slug: 'authz_database_claim',
  category: 'authz',
  display_name: 'Session Database Claim',
  description:
    "Passes when the row's database column equals the session's pinned database claim (jwt.claims.database_id). " +
    'Consults no principal, membership or entity, so it admits a connection whose identity is set by infrastructure — ' +
    "such as a cloud function's pg-wire proxy lane, which pins the claim from the connection and cannot widen it — " +
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
      }
    }
  },
  tags: ['authz', 'infrastructure']
};
