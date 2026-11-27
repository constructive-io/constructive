import type { NodeTypeDefinition } from '../types';
import { AUTHZ_EXPRESSION, EXPRESSION_KEYS } from './parameters';

export const AuthzComposite: NodeTypeDefinition = {
  name: 'AuthzComposite',
  slug: 'authz_composite',
  category: 'authz',
  display_name: 'Composite Policy',
  description: 'Composite authorization policy that combines multiple authorization nodes using boolean logic (AND/OR). The data field contains a JSONB AST with nested authorization nodes.',
  parameter_schema: {
    type: 'object',
    format: 'authz-expression',
    description: 'A composite policy containing nested authorization nodes combined with boolean logic: one Authz expression',
    properties: {
      OR: {
        type: 'array',
        description: 'Array of authorization nodes combined with OR',
        minItems: 1,
        items: AUTHZ_EXPRESSION
      },
      AND: {
        type: 'array',
        description: 'Array of authorization nodes combined with AND',
        minItems: 1,
        items: AUTHZ_EXPRESSION
      },
      NOT: {
        ...AUTHZ_EXPRESSION,
        description: 'A single authorization node to negate'
      },
      BoolExpr: {
        type: 'object',
        description: 'A stored boolean expression node; the platform writes it on its own policies, and a rule a caller writes uses OR, AND or NOT instead',
        readOnly: true,
        properties: {
          boolop: {
            type: 'string',
            enum: ['AND_EXPR', 'OR_EXPR', 'NOT_EXPR'],
            description: 'Boolean operator: AND_EXPR, OR_EXPR, or NOT_EXPR'
          },
          args: {
            type: 'array',
            description: 'Array of authorization nodes or nested BoolExpr ASTs',
            items: {
              type: 'object'
            }
          }
        }
      }
    },
    minProperties: 1,
    maxProperties: 1,
    propertyNames: { enum: [...EXPRESSION_KEYS, 'BoolExpr'] },
    additionalProperties: { type: 'object' }
  },
  tags: [
    'composite',
    'authz'
  ],
  summary: 'Combines other policies with and, or and not; who passes depends on the parts.',
  use_when: [
    'Rules no single policy covers, such as "a member of the team and the row is not private".'
  ],
  avoid_when: [
    'AuthzDirectOwner in an or-list next to a membership rule on a team table: join the owner check to a membership rule with and.'
  ],
  risks: [
    'A not around a membership rule lets in everyone who is not a member.',
    'Under OR, each part lets people in on its own, so one wide part (such as AuthzAllowAll) opens the whole rule.'
  ]
};
