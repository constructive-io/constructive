import type { NodeTypeDefinition } from '../types';

export const AuthzComposite: NodeTypeDefinition = {
  name: 'AuthzComposite',
  slug: 'authz_composite',
  category: 'authz',
  display_name: 'Composite Policy',
  description: 'Composite authorization policy that combines multiple authorization nodes using boolean logic (AND/OR). The data field contains a JSONB AST with nested authorization nodes.',
  parameter_schema: {
    type: 'object',
    description: 'A composite policy containing nested authorization nodes combined with boolean logic',
    properties: {
      OR: {
        type: 'array',
        description: 'Array of authorization nodes combined with OR',
        items: {
          type: 'object',
          description: 'A nested authorization node or boolean combinator'
        }
      },
      AND: {
        type: 'array',
        description: 'Array of authorization nodes combined with AND',
        items: {
          type: 'object',
          description: 'A nested authorization node or boolean combinator'
        }
      },
      NOT: {
        type: 'object',
        description: 'A single authorization node to negate'
      },
      BoolExpr: {
        type: 'object',
        description: 'Raw Postgres BoolExpr AST node (power-user / backwards-compatible)',
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
    }
  },
  tags: [
    'composite',
    'authz'
  ]
};
