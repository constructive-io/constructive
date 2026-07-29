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
    properties: {}
  },
  tags: ['authz', 'system']
};
