import type { NodeTypeDefinition } from '../types';

export const FieldInflection: NodeTypeDefinition = {
  name: 'FieldInflection',
  slug: 'field_inflection',
  category: 'field',
  display_name: 'Inflection',
  description: 'Transforms field values using inflection operations (snake_case, camelCase, etc).',
  parameter_schema: {
      "type": "object",
      "properties": {
        "field_id": {
          "type": "string",
          "format": "uuid",
          "description": "Target field"
        },
        "ops": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Inflection operations to apply"
        }
      },
      "required": [
        "field_id",
        "ops"
      ]
    },
  tags: ['transform', 'behavior'],
};
