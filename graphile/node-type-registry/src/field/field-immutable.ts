import type { NodeTypeDefinition } from '../types';

export const FieldImmutable: NodeTypeDefinition = {
  name: 'FieldImmutable',
  slug: 'field_immutable',
  category: 'field',
  display_name: 'Immutable',
  description: 'Prevents a field from being modified after initial insert.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "field_id": {
          "type": "string",
          "format": "uuid",
          "description": "UUID of the field that cannot be updated"
        }
      },
      "required": [
        "field_id"
      ]
    },
  tags: ['constraint', 'behavior'],
};
