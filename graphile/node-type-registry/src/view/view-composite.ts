import type { NodeTypeDefinition } from '../types';

export const ViewComposite: NodeTypeDefinition = {
  name: 'ViewComposite',
  slug: 'view_composite',
  category: 'view',
  display_name: 'Composite View',
  description: 'Advanced view using composite AST for the query. Use when other node types are insufficient (CTEs, UNIONs, complex subqueries, etc.).',
  parameter_schema: {
      "type": "object",
      "properties": {
        "query_ast": {
          "type": "object",
          "description": "Composite SELECT query AST (JSONB)"
        }
      },
      "required": [
        "query_ast"
      ]
    },
  tags: ['view', 'advanced', 'composite', 'ast'],
};
