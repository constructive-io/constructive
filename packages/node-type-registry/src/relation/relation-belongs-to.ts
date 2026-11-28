import type { NodeTypeDefinition } from '../types';

export const RelationBelongsTo: NodeTypeDefinition = {
  name: 'RelationBelongsTo',
  slug: 'relation_belongs_to',
  category: 'relation',
  display_name: 'Belongs To',
  description: 'Creates a foreign key field on the source table referencing the target table. Auto-derives the FK field name from the target table name using inflection (e.g., projects derives project_id). delete_action is required and must be explicitly provided by the caller.',
  parameter_schema: {
    type: 'object',
    properties: {
      source_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'Table that will have the FK field added'
      },
      target_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'Table being referenced by the FK'
      },
      field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'FK field name on the source table. Auto-derived from target table name if omitted (e.g., projects → project_id)'
      },
      delete_action: {
        type: 'string',
        enum: [
          'c',
          'r',
          'n',
          'd',
          'a'
        ],
        description: 'FK delete action: c=CASCADE, r=RESTRICT, n=SET NULL, d=SET DEFAULT, a=NO ACTION. Required.'
      },
      is_required: {
        type: 'boolean',
        description: 'Whether the FK field is NOT NULL',
        default: true
      },
      scope_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Columns both tables carry that the referenced row must share with the referencing row (e.g. ["entity_id"], or ["project_id"] for a stage of the same project). Adds a hidden composite FK (field_name, ...scope_fields) -> target (id, ...scope_fields) plus the target unique key it needs, so a row cannot point at another scope\'s row even when it knows the id.'
      }
    },
    required: [
      'source_table_id',
      'target_table_id',
      'delete_action'
    ]
  },
  tags: [
    'relation',
    'foreign_key',
    'schema'
  ]
};
