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
      BoolExpr: {
        type: 'object',
        description: 'Boolean expression combining multiple authorization nodes',
        properties: {
          boolop: {
            type: 'string',
            enum: [
              'AND_EXPR',
              'OR_EXPR',
              'NOT_EXPR'
            ],
            description: 'Boolean operator: AND_EXPR, OR_EXPR, or NOT_EXPR'
          },
          args: {
            type: 'array',
            description: 'Array of authorization nodes to combine',
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
