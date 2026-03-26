import type { NodeTypeDefinition } from '../types';

export const DataFullTextSearch: NodeTypeDefinition = {
  name: 'DataFullTextSearch',
  slug: 'data_full_text_search',
  category: 'data',
  display_name: 'Full-Text Search',
  description: 'Adds a tsvector column with GIN index and automatic trigger population from source fields. Enables PostgreSQL full-text search with configurable weights and language support. Leverages the existing metaschema full_text_search infrastructure.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "field_name": {
          "type": "string",
          "description": "Name of the tsvector column",
          "default": "search"
        },
        "source_fields": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "field": {
                "type": "string",
                "description": "Name of the source column"
              },
              "weight": {
                "type": "string",
                "enum": [
                  "A",
                  "B",
                  "C",
                  "D"
                ],
                "description": "tsvector weight class (A=highest, D=lowest)",
                "default": "D"
              },
              "lang": {
                "type": "string",
                "description": "PostgreSQL text search configuration",
                "default": "english"
              }
            },
            "required": [
              "field"
            ]
          },
          "description": "Source columns that feed the tsvector. Each has a field name, weight (A-D), and language config."
        },
        "search_score_weight": {
          "type": "number",
          "description": "Weight for this algorithm in composite searchScore",
          "default": 1
        }
      },
      "required": [
        "source_fields"
      ]
    },
  tags: ['search', 'fts', 'tsvector', 'schema'],
};
