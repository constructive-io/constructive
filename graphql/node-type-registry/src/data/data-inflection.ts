import type { NodeTypeDefinition } from '../types';

export const DataInflection: NodeTypeDefinition = {
  "name": "DataInflection",
  "slug": "data_inflection",
  "category": "data",
  "display_name": "Inflection",
  "description": "Transforms field values using inflection operations (snake_case, camelCase, slugify, plural, singular, etc). Attaches BEFORE INSERT and BEFORE UPDATE triggers. References fields by name in data jsonb.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "description": "Name of the field to transform"
      },
      "ops": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "plural",
            "singular",
            "camel",
            "pascal",
            "dashed",
            "slugify",
            "underscore",
            "lower",
            "upper"
          ]
        },
        "description": "Inflection operations to apply in order"
      }
    },
    "required": [
      "field_name",
      "ops"
    ]
  },
  "tags": [
    "transform",
    "behavior"
  ]
};
