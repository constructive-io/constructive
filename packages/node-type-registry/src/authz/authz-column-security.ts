import type { NodeTypeDefinition } from '../types';

export const AuthzColumnSecurity: NodeTypeDefinition = {
  name: 'AuthzColumnSecurity',
  slug: 'authz_column_security',
  category: 'authz',
  display_name: 'Column Security',
  description:
    'Column-level write authorization. Generates BEFORE INSERT/UPDATE triggers that enforce an authorization node whenever a guarded column is written to a protected value or transitions. The write-time counterpart to RLS SELECT/WITH CHECK policies: any table can declare "only an actor satisfying <authz> may set column X". The nested authz value is a normal Authz node compiled by the standard RLS pipeline; row-referencing nodes have their protected-table column references rebound to NEW. The immutable rule delegates to the native DataImmutableFields generator.',
  parameter_schema: {
    type: 'object',
    properties: {
      columns: {
        type: 'array',
        items: { type: 'string', format: 'column-ref', 'x-column-scope': 'local' },
        description:
          'Guarded columns that share the same rule and authorization (e.g. ["is_shared"]).'
      },
      rule: {
        type: 'string',
        enum: [
          'set_true',
          'set_false',
          'set_values',
          'writable_when',
          'transition',
          'immutable'
        ],
        description:
          'Write pattern that arms the guard: set_true/set_false (column set to that boolean), set_values (column set to one of values), writable_when (column written/changed at all), transition (OLD->NEW pairs in allowed), immutable (delegates to DataImmutableFields).',
        default: 'writable_when'
      },
      authz: {
        type: 'object',
        description:
          'Any Authz node (AuthzAppMembership, AuthzComposite, AuthzValueExists, ...) that must be satisfied to perform the guarded write. Required for all rules except immutable.'
      },
      values: {
        type: 'array',
        items: { type: 'string' },
        description: 'For rule=set_values: the protected values that arm the guard.'
      },
      allowed: {
        type: 'array',
        items: { type: 'string' },
        description:
          'For rule=transition: allowed guarded transitions expressed as "from->to" (e.g. ["member->admin"]).'
      },
      allow_system: {
        type: 'boolean',
        description:
          'When true, the system role (AuthzSystemOnly) bypasses the guard so provisioning/seed paths without a JWT principal can write freely.',
        default: false
      },
      error_code: {
        type: 'string',
        description:
          'Machine-readable code prefixed onto the raised error message (e.g. MANAGED_DOMAIN_PUBLISH_FORBIDDEN).'
      },
      error_message: {
        type: 'string',
        description: 'Human-readable message raised when the guard denies the write.'
      }
    },
    required: ['columns', 'rule']
  },
  tags: ['column-security', 'write-guard', 'trigger', 'authz']
};
