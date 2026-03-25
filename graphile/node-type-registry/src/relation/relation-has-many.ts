import type { NodeTypeDefinition } from '../types';

export const RelationHasMany: NodeTypeDefinition = {
  name: 'RelationHasMany',
  slug: 'relation_has_many',
  category: 'relation',
  display_name: 'Has Many',
  description: 'Creates a foreign key field on the target table referencing the source table. Inverse of RelationBelongsTo — same FK, different perspective. "projects has many tasks" creates tasks.project_id. Auto-derives the FK field name from the source table name using inflection. delete_action is required and must be explicitly provided by the caller.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "source_table_id": {
          "type": "string",
          "format": "uuid",
          "description": "Parent table being referenced by the FK (e.g., projects in projects has many tasks)"
        },
        "target_table_id": {
          "type": "string",
          "format": "uuid",
          "description": "Child table that receives the FK field (e.g., tasks in projects has many tasks)"
        },
        "field_name": {
          "type": "string",
          "description": "FK field name on the target table. Auto-derived from source table name if omitted (e.g., projects derives project_id)"
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
  tags: ['relation', 'foreign_key', 'has_many', 'schema'],
};
