import type { NodeTypeDefinition } from '../types';

export const DataSlug: NodeTypeDefinition = {
  "name": "DataSlug",
  "slug": "data_slug",
  "category": "data",
  "display_name": "Slug",
  "description": "Auto-generates URL-friendly slugs from field values on insert/update. Attaches BEFORE INSERT and BEFORE UPDATE triggers that call inflection.slugify() on the target field. References fields by name in data jsonb.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "description": "Name of the field to slugify"
      },
      "source_field_name": {
        "type": "string",
        "description": "Optional source field name (defaults to field_name)"
      }
    },
    "required": [
      "field_name"
    ]
  },
  "tags": [
    "transform",
    "behavior"
  ]
};
