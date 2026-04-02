import type { NodeTypeDefinition } from '../types';

export const SearchBm25: NodeTypeDefinition = {
  "name": "SearchBm25",
  "slug": "search_bm25",
  "category": "search",
  "display_name": "BM25 Search",
  "description": "Creates a BM25 index on an existing text column using pg_textsearch. Enables statistical relevance ranking with configurable k1 and b parameters. The BM25 index is auto-detected by graphile-search.",
  "parameter_schema": {
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "description": "Name of existing text column to index with BM25"
      },
      "text_config": {
        "type": "string",
        "description": "PostgreSQL text search configuration for BM25",
        "default": "english"
      },
      "k1": {
        "type": "number",
        "description": "BM25 k1 parameter: term frequency saturation (typical: 1.2-2.0)",
        "default": null
      },
      "b": {
        "type": "number",
        "description": "BM25 b parameter: document length normalization (0=none, 1=full, typical: 0.75)",
        "default": null
      },
      "search_score_weight": {
        "type": "number",
        "description": "Weight for this algorithm in composite searchScore",
        "default": 1
      }
    },
    "required": [
      "field_name"
    ]
  },
  "tags": [
    "search",
    "bm25",
    "schema"
  ]
};
