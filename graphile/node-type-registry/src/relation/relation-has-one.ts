import type { NodeTypeDefinition } from '../types';

export const RelationHasOne: NodeTypeDefinition = {
  name: 'RelationHasOne',
  slug: 'relation_has_one',
  category: 'relation',
  display_name: 'Has One',
  description: 'Creates a foreign key field with a unique constraint on the source table referencing the target table. Enforces 1:1 cardinality. Auto-derives the FK field name from the target table name using inflection. delete_action is required and must be explicitly provided by the caller.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "source_table_id": {
          "type": "string",
          "format": "uuid",
          "description": "Table that will have the FK field and unique constraint"
        },
        "target_table_id": {
          "type": "string",
          "format": "uuid",
          "description": "Table being referenced by the FK"
        },
        "field_name": {
          "type": "string",
          "description": "FK field name on the source table. Auto-derived from target table name if omitted (e.g., users → user_id)"
        },
        "delete_action": {
          "type": "string",
          "enum": [
            "c",
            "r",
            "n",
            "d",
            "a"
          ],
          "description": "FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, d=SET DEFAULT, a=NO ACTION. Required."
        },
        "is_required": {
          "type": "boolean",
          "description": "Whether the FK field is NOT NULL",
          "default": true
        }
      },
      "required": [
        "source_table_id",
        "target_table_id",
        "delete_action"
      ]
    },
  tags: ['relation', 'foreign_key', 'unique', 'schema'],
};
