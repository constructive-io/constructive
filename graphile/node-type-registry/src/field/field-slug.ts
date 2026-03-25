import type { NodeTypeDefinition } from '../types';

export const FieldSlug: NodeTypeDefinition = {
  name: 'FieldSlug',
  slug: 'field_slug',
  category: 'field',
  display_name: 'Slug',
  description: 'Auto-generates URL-friendly slugs from field values on insert/update.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "field_id": {
          "type": "string",
          "format": "uuid",
          "description": "Target field to slugify"
        },
        "source_field_id": {
          "type": "string",
          "format": "uuid",
          "description": "Optional source field (defaults to target)"
        }
      },
      "required": [
        "field_id"
      ]
    },
  tags: ['transform', 'behavior'],
};
