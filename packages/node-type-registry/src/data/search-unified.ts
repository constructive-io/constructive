import type { NodeTypeDefinition } from '../types';

export const SearchUnified: NodeTypeDefinition = {
  name: 'SearchUnified',
  slug: 'search_unified',
  category: 'search',
  display_name: 'Unified Search',
  description: 'Composite node type that orchestrates multiple search modalities (full-text search, BM25, embeddings, trigram) on a single table. Configures per-table search score weights, normalization strategy, and recency boost via the @searchConfig smart tag.',
  parameter_schema: {
    type: 'object',
    properties: {
      full_text_search: {
        type: 'object',
        description: 'SearchFullText parameters. Omit to skip FTS setup.',
        properties: {
          field_name: {
            type: 'string',
            format: 'column-ref',
            default: 'search'
          },
          source_fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  format: 'column-ref'
                },
                weight: {
                  type: 'string',
                  enum: [
                    'A',
                    'B',
                    'C',
                    'D'
                  ]
                },
                lang: {
                  type: 'string'
                }
              },
              required: [
                'field'
              ]
            }
          },
          search_score_weight: {
            type: 'number',
            default: 1
          }
        }
      },
      bm25: {
        type: 'object',
        description: 'SearchBm25 parameters. Omit to skip BM25 setup.',
        properties: {
          field_name: {
            type: 'string',
            format: 'column-ref'
          },
          text_config: {
            type: 'string',
            default: 'english'
          },
          k1: {
            type: 'number'
          },
          b: {
            type: 'number'
          },
          search_score_weight: {
            type: 'number',
            default: 1
          }
        }
      },
      embedding: {
        type: 'object',
        description: 'SearchVector parameters. Omit to skip embedding setup.',
        properties: {
          field_name: {
            type: 'string',
            format: 'column-ref',
            default: 'embedding'
          },
          dimensions: {
            type: 'integer',
            default: 768
          },
          index_method: {
            type: 'string',
            enum: [
              'hnsw',
              'ivfflat'
            ]
          },
          metric: {
            type: 'string',
            enum: [
              'cosine',
              'l2',
              'ip'
            ]
          },
          source_fields: {
            type: 'array',
            items: {
              type: 'string',
              format: 'column-ref'
            }
          },
          search_score_weight: {
            type: 'number',
            default: 1
          },
          chunks: {
            type: 'object',
            description: 'Chunking configuration for long-text embedding. Creates an embedding_chunks record that drives automatic text splitting and per-chunk embedding. Omit to skip chunking.',
            properties: {
              content_field_name: {
                type: 'string',
                format: 'column-ref',
                description: 'Name of the text content column in the chunks table',
                default: 'content'
              },
              chunk_size: {
                type: 'integer',
                description: 'Maximum number of characters per chunk',
                default: 1000
              },
              chunk_overlap: {
                type: 'integer',
                description: 'Number of overlapping characters between consecutive chunks',
                default: 200
              },
              chunk_strategy: {
                type: 'string',
                enum: [
                  'fixed',
                  'sentence',
                  'paragraph',
                  'semantic'
                ],
                description: 'Strategy for splitting text into chunks',
                default: 'fixed'
              },
              metadata_fields: {
                type: 'object',
                description: 'Metadata fields from parent to copy into chunks'
              },
              enqueue_chunking_job: {
                type: 'boolean',
                description: 'Whether to auto-enqueue a chunking job on insert/update',
                default: true
              },
              chunking_task_name: {
                type: 'string',
                description: 'Task identifier for the chunking job queue',
                default: 'generate_chunks'
              }
            }
          }
        }
      },
      trgm_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Field names to tag with @trgmSearch for fuzzy/typo-tolerant matching'
      },
      search_config: {
        type: 'object',
        description: 'Unified search score configuration written to @searchConfig smart tag',
        properties: {
          weights: {
            type: 'object',
            description: 'Per-algorithm weights: {tsv: 1.5, bm25: 1.0, pgvector: 0.8, trgm: 0.3}'
          },
          normalization: {
            type: 'string',
            enum: [
              'linear',
              'sigmoid'
            ],
            description: 'Score normalization strategy',
            default: 'linear'
          },
          boost_recent: {
            type: 'boolean',
            description: 'Enable recency boost for search results',
            default: false
          },
          boost_recency_field: {
            type: 'string',
            format: 'column-ref',
            description: 'Timestamp field for recency boost (e.g. created_at, updated_at)'
          },
          boost_recency_decay: {
            type: 'number',
            description: 'Decay rate for recency boost (0-1, lower = faster decay)',
            default: 0.5
          }
        }
      }
    }
  },
  tags: [
    'search',
    'composite',
    'schema'
  ]
};
