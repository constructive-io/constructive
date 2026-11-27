import type { NodeTypeDefinition } from '../types';

export const AuthzSystemOnly: NodeTypeDefinition = {
  name: 'AuthzSystemOnly',
  slug: 'authz_system_only',
  category: 'authz',
  display_name: 'System Only',
  description:
    'Restricts access to system-initiated operations (triggers, background jobs). ' +
    'Checks jwt.claims.role_type = "system". Normal API requests default to "user" and are denied. ' +
    'Use for INSERT policies on append-only event/audit/usage tables.',
  parameter_schema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  tags: ['authz', 'system'],
  summary: 'A limit: only work the system runs itself passes; it never lets a normal request in.',
  use_when: [
    'Create on append-only event, audit or usage tables that only the platform writes.'
  ],
  avoid_when: [
    'Any operation people or agents must perform themselves.'
  ]
};
