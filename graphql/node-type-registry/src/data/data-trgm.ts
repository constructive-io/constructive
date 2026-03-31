import type { NodeTypeDefinition } from '../types';

export const DataTrgm: NodeTypeDefinition = {
  "name": "DataTrgm",
  "slug": "data_trgm",
  "category": "data",
  "display_name": "Trigram Search",
  "description": "Creates GIN trigram indexes (gin_trgm_ops) on specified text/citext fields for fuzzy LIKE/ILIKE/similarity search. Adds @trgmSearch smart tag for PostGraphile integration. Fields must already exist on the table.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "fields": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Field names to create trigram indexes on (fields must already exist on the table)"
      }
    },
    "required": [
      "fields"
    ]
  },
  "tags": [
    "search",
    "trigram",
    "schema"
  ]
};
