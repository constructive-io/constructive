import type { NodeTypeDefinition } from '../types';

export const DataI18n: NodeTypeDefinition = {
  name: 'DataI18n',
  slug: 'data_i18n',
  category: 'data',
  display_name: 'Internationalization',
  description:
    'Creates a companion _translations table with lang_code + translatable ' +
    'fields. Copies SELECT policies and column-ref fields from the base ' +
    'table. Adds @i18n smart comment so the Graphile i18n plugin discovers ' +
    'it. Requires i18n_module to be provisioned for the database.',
  parameter_schema: {
    type: 'object',
    properties: {
      fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description:
          'Field names on the base table to make translatable. Each field ' +
          'is duplicated on the translation table with the same type.'
      },
      table_suffix: {
        type: 'string',
        description: 'Suffix for the translation table name',
        default: '_translations'
      },
      lang_code_type: {
        type: 'string',
        enum: ['citext', 'text'],
        description: 'Type for the lang_code column',
        default: 'citext'
      },
      copy_mutation_policies: {
        type: 'boolean',
        description:
          'Whether to also copy INSERT/UPDATE/DELETE policies (not just ' +
          'SELECT). Default true — translations should be editable by the ' +
          'same users who can edit the base row.',
        default: true
      },
      search: {
        type: 'object',
        description:
          'SearchFullText configuration for the translations table. When ' +
          'provided, creates a tsvector column on the translations table ' +
          'with lang_column=lang_code for dynamic per-row language stemming.',
        properties: {
          field_name: {
            type: 'string',
            format: 'column-ref',
            description: 'Name of the tsvector column on the translations table',
            default: 'search'
          },
          source_fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  format: 'column-ref',
                  description: 'Name of the translatable source column'
                },
                weight: {
                  type: 'string',
                  enum: ['A', 'B', 'C', 'D'],
                  description: 'tsvector weight class (A=highest, D=lowest)',
                  default: 'D'
                }
              },
              required: ['field']
            },
            description:
              'Translatable columns that feed the tsvector. Language is ' +
              'determined dynamically from the lang_code column of each row.'
          },
          search_score_weight: {
            type: 'number',
            description: 'Weight for this algorithm in composite searchScore',
            default: 1
          }
        },
        required: ['source_fields']
      }
    },
    required: ['fields']
  },
  tags: ['i18n', 'translation', 'schema']
};
