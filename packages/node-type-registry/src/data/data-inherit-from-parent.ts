import type { NodeTypeDefinition } from '../types';

export const DataInheritFromParent: NodeTypeDefinition = {
  name: 'DataInheritFromParent',
  slug: 'data_inherit_from_parent',
  category: 'data',
  display_name: 'Inherit From Parent',
  description: 'BEFORE INSERT trigger that copies specified fields from a parent table via a foreign key. The parent row is looked up through RLS (SECURITY INVOKER), so the insert fails if the caller cannot see the parent. Used by the storage module to inherit owner_id and is_public from buckets to files.',
  parameter_schema: {
    type: 'object',
    properties: {
      parent_fk_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the FK field on this table that references the parent (e.g. bucket_id)'
      },
      fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description: 'Field names to copy from the parent row (e.g. ["owner_id", "is_public"])'
      },
      parent_table: {
        type: 'string',
        description: 'Parent table name (optional fallback if FK not yet registered in metaschema)'
      },
      parent_schema: {
        type: 'string',
        description: 'Parent table schema (optional, defaults to same schema as child table)'
      }
    },
    required: [
      'parent_fk_field',
      'fields'
    ]
  },
  tags: [
    'trigger',
    'inheritance',
    'schema'
  ]
};
