import type { NodeTypeDefinition } from '../types';

export const RelationManyToMany: NodeTypeDefinition = {
  name: 'RelationManyToMany',
  slug: 'relation_many_to_many',
  category: 'relation',
  display_name: 'Many to Many',
  description: 'Creates a junction table between source and target tables with auto-derived naming and FK fields. The trigger creates a bare table (no implicit DataId), adds FK fields to both tables, optionally creates a composite PK (use_composite_key), then forwards all security config to secure_table_provision as-is. The trigger never injects values the caller did not provide. Junction table FKs always CASCADE on delete.',
  parameter_schema: {
    type: 'object',
    properties: {
      source_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'First table in the M:N relationship'
      },
      target_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'Second table in the M:N relationship'
      },
      junction_table_id: {
        type: 'string',
        format: 'uuid',
        description: 'Existing junction table to use. If uuid_nil(), a new bare table is created'
      },
      junction_table_name: {
        type: 'string',
        description: 'Junction table name. Auto-derived from both table names if omitted (e.g., projects + tags derives project_tags)'
      },
      source_field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'FK field name on junction for source table. Auto-derived if omitted (e.g., projects derives project_id)'
      },
      target_field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'FK field name on junction for target table. Auto-derived if omitted (e.g., tags derives tag_id)'
      },
      use_composite_key: {
        type: 'boolean',
        description: 'When true, creates a composite PK from the two FK fields. When false, no PK is created by the trigger (use nodes with DataId for UUID PK). Mutually exclusive with nodes containing DataId.',
        default: false
      },
      nodes: {
        type: 'array',
        items: {
          type: 'object'
        },
        description: 'Array of node objects for field creation on junction table. Each object has a $type key (e.g. DataId, DataEntityMembership) and optional data keys. Forwarded to secure_table_provision as-is. Empty array means no additional fields.'
      },
      grants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            roles: { type: 'array', items: { type: 'string' } },
            privileges: { type: 'array', items: { type: 'array', items: { type: 'string' } } }
          },
          required: ['roles', 'privileges']
        },
        description: 'Unified grant objects for the junction table. Each entry is { roles: string[], privileges: string[][] }. Forwarded to secure_table_provision as-is. Default: []'
      },
      policies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            $type: { type: 'string' },
            data: { type: 'object' },
            privileges: { type: 'array', items: { type: 'string' } },
            policy_role: { type: 'string' },
            permissive: { type: 'boolean' },
            policy_name: { type: 'string' }
          },
          required: ['$type']
        },
        description: 'RLS policy objects for the junction table. Each entry has $type (Authz* generator), optional data, privileges, policy_role, permissive, policy_name. Forwarded to secure_table_provision as-is. Default: []'
      }
    },
    required: [
      'source_table_id',
      'target_table_id'
    ]
  },
  tags: [
    'relation',
    'junction',
    'many_to_many',
    'schema'
  ]
};
