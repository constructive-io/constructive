import type { NodeTypeDefinition } from '../types';

export const FieldOwned: NodeTypeDefinition = {
  name: 'FieldOwned',
  slug: 'field_owned',
  category: 'field',
  display_name: 'Owned',
  description: 'Restricts which user can modify specific columns in shared objects. For tables where multiple users have access but each can only modify certain columns.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "table_id": {
          "type": "string",
          "format": "uuid",
          "description": "Target table"
        },
        "role_key_field_id": {
          "type": "string",
          "format": "uuid",
          "description": "Field identifying the owner (e.g., sender_id)"
        },
        "protected_field_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          },
          "description": "Fields only this owner can modify"
        }
      },
      "required": [
        "table_id",
        "role_key_field_id",
        "protected_field_ids"
      ]
    },
  tags: ['ownership', 'constraint', 'behavior'],
};
