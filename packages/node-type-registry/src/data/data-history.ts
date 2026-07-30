import type { NodeTypeDefinition } from '../types';

export const DataHistory: NodeTypeDefinition = {
  name: 'DataHistory',
  slug: 'data_history',
  category: 'data',
  display_name: 'Row History',
  description:
    'Creates a companion <table>_history table that records a new version ' +
    'row on every INSERT/UPDATE/DELETE via an AFTER trigger. The history ' +
    'table copies the source columns as plain nullable columns with NO keys ' +
    'or constraints, plus a recorded_at timestamp and a history_op column ' +
    '(NEW-append: INSERT/UPDATE store the new row, DELETE stores a tombstone). ' +
    'SELECT policies are cloned from the base table. Optionally range-partitions ' +
    'the history table by recorded_at (pg_partman) with a retention window so ' +
    'history is kept for a while but not forever. Adds an @history smart comment ' +
    'so the Graphile history plugin can expose version queries and restore ' +
    'mutations.',
  parameter_schema: {
    type: 'object',
    properties: {
      table_suffix: {
        type: 'string',
        description: 'Suffix for the history table name',
        default: '_history'
      },
      recorded_at_field: {
        type: 'string',
        format: 'column-ref',
        description:
          'Column name for the version timestamp (also the partition key ' +
          'when partitioned)',
        default: 'recorded_at'
      },
      operation_field: {
        type: 'string',
        format: 'column-ref',
        description:
          "Column name recording the operation ('INSERT' | 'UPDATE' | 'DELETE')",
        default: 'history_op'
      },
      exclude_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description:
          'Source columns to omit from the history table (e.g. large jsonb ' +
          'or vector columns). Excluded columns are never created on the ' +
          'history table and never written by the trigger.',
        default: []
      },
      copy_mutation_policies: {
        type: 'boolean',
        description:
          'Whether to also clone INSERT/UPDATE/DELETE policies (not just ' +
          'SELECT). Default false — the history table is written only by the ' +
          'trigger and exposed read-only through GraphQL.',
        default: false
      },
      partitioned: {
        type: 'boolean',
        description:
          'When true, range-partition the history table by recorded_at via ' +
          'pg_partman so old partitions can be dropped per the retention window.',
        default: false
      },
      partition_interval: {
        type: 'string',
        description: 'pg_partman partition interval (when partitioned)',
        default: '1 month'
      },
      retention: {
        type: 'string',
        description:
          'pg_partman retention window; partitions older than this are ' +
          'dropped by run_maintenance (when partitioned). Empty keeps forever.',
        default: '12 months'
      },
      premake: {
        type: 'integer',
        description: 'Number of future partitions pg_partman pre-creates',
        default: 2
      }
    }
  },
  tags: ['history', 'audit', 'versioning', 'schema']
};
