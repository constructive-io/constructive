import type { NodeTypeDefinition } from '../types';

export const DataSearch: NodeTypeDefinition = {
  name: 'DataSearch',
  slug: 'data_search',
  category: 'data',
  display_name: 'Unified Search',
  description: 'Composite node type that orchestrates multiple search modalities (full-text search, BM25, embeddings, trigram) on a single table. Configures per-table search score weights, normalization strategy, and recency boost via the @searchConfig smart tag.',
  parameter_schema: {
      "type": "object",
      "properties": {
        "full_text_search": {
          "type": "object",
          "description": "DataFullTextSearch parameters. Omit to skip FTS setup.",
          "properties": {
            "field_name": {
              "type": "string",
              "default": "search"
            },
            "source_fields": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "field": {
                    "type": "string"
                  },
                  "weight": {
                    "type": "string",
                    "enum": [
                      "A",
                      "B",
                      "C",
                      "D"
                    ]
                  },
                  "lang": {
                    "type": "string"
                  }
                },
                "required": [
                  "field"
                ]
              }
            },
            "search_score_weight": {
              "type": "number",
              "default": 1
            }
          }
        },
        "bm25": {
          "type": "object",
          "description": "DataBm25 parameters. Omit to skip BM25 setup.",
          "properties": {
            "field_name": {
              "type": "string"
            },
            "text_config": {
              "type": "string",
              "default": "english"
            },
            "k1": {
              "type": "number"
            },
            "b": {
              "type": "number"
            },
            "search_score_weight": {
              "type": "number",
              "default": 1
            }
          }
        },
        "embedding": {
          "type": "object",
          "description": "DataEmbedding parameters. Omit to skip embedding setup.",
          "properties": {
            "field_name": {
              "type": "string",
              "default": "embedding"
            },
            "dimensions": {
              "type": "integer",
              "default": 768
            },
            "index_method": {
              "type": "string",
              "enum": [
                "hnsw",
                "ivfflat"
              ]
            },
            "metric": {
              "type": "string",
              "enum": [
                "cosine",
                "l2",
                "ip"
              ]
            },
            "source_fields": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "search_score_weight": {
              "type": "number",
              "default": 1
            }
          }
        },
        "trgm_fields": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Field names to tag with @trgmSearch for fuzzy/typo-tolerant matching"
        },
        "search_config": {
          "type": "object",
          "description": "Unified search score configuration written to @searchConfig smart tag",
          "properties": {
            "weights": {
              "type": "object",
              "description": "Per-algorithm weights: {tsv: 1.5, bm25: 1.0, pgvector: 0.8, trgm: 0.3}"
            },
            "normalization": {
              "type": "string",
              "enum": [
                "linear",
                "sigmoid"
              ],
              "description": "Score normalization strategy",
              "default": "linear"
            },
            "boost_recent": {
              "type": "boolean",
              "description": "Enable recency boost for search results",
              "default": false
            },
            "boost_recency_field": {
              "type": "string",
              "description": "Timestamp field for recency boost (e.g. created_at, updated_at)"
            },
            "boost_recency_decay": {
              "type": "number",
              "description": "Decay rate for recency boost (0-1, lower = faster decay)",
              "default": 0.5
            }
          }
        }
      }
    },
  tags: ['search', 'composite', 'schema'],
};
