import type { NodeTypeDefinition } from '../types';
import { AUTHZ_EXPRESSION } from './parameters';

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
        minItems: 1,
        description:
          'Guarded columns that share the same rule and authorization (e.g. ["is_shared"]).'
      },
      rule: {
        type: 'string',
        enum: [
          'set_true',
          'set_false',
          'set_values',
          'not_values',
          'writable_when',
          'transition',
          'immutable'
        ],
        description:
          'Write pattern that arms the guard: set_true/set_false (column set to that boolean), set_values (column set to one of values), not_values (column set to a non-NULL value outside values), writable_when (column written/changed at all), transition (OLD->NEW pairs in allowed), immutable (delegates to DataImmutableFields).',
        default: 'writable_when'
      },
      authz: {
        ...AUTHZ_EXPRESSION,
        description:
          'An Authz expression (one node such as {"AuthzAppMembership": {...}}, or AND, OR or NOT over nodes) that must be satisfied to perform the guarded write. Required for all rules except immutable.'
      },
      values: {
        type: 'array',
        items: { type: 'string' },
        description: 'For rule=set_values: the protected values that arm the guard. For rule=not_values: the allowed values; any non-NULL value outside them arms the guard.'
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
      },
      conditions: {
        type: ['object', 'array'],
        items: { type: 'object' },
        description: 'Conditions on the row being written; the guard arms only when the write matches the rule and the row meets them.'
      }
    },
    required: ['columns', 'rule'],
    allOf: [
      { if: { properties: { rule: { not: { const: 'immutable' } } } }, then: { required: ['authz'] } },
      { if: { properties: { rule: { enum: ['set_values', 'not_values'] } } }, then: { required: ['values'], properties: { values: { minItems: 1 } } } },
      { if: { properties: { rule: { const: 'transition' } } }, then: { required: ['allowed'], properties: { allowed: { minItems: 1 } } } }
    ],
    additionalProperties: false
  },
  tags: ['column-security', 'write-guard', 'trigger', 'authz'],
  summary: 'Limits who may write certain columns; it never gives access to a row.',
  use_when: [
    'Only admins may set a flag such as is_shared or is_published.',
    'Only some changes are allowed, such as member to admin.',
    'With the immutable pattern, nobody may change the column after the row is made.'
  ],
  avoid_when: [
    'Hiding a column from a role completely: leave the column out of that role\'s grant instead.'
  ]
};
