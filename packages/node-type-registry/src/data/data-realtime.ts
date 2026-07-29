import type { NodeTypeDefinition } from '../types';

export const DataRealtime: NodeTypeDefinition = {
  name: 'DataRealtime',
  slug: 'data_realtime',
  category: 'data',
  display_name: 'Realtime Subscriptions',
  description:
    'Creates per-table subscriber tables in subscriptions_public with ' +
    'RLS policies derived from source table SELECT policies. Attaches ' +
    'statement-level triggers to emit changes to subscribers.',
  parameter_schema: {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['INSERT', 'UPDATE', 'DELETE']
        },
        description:
          'Which DML operations to track with emit_change triggers',
        default: ['INSERT', 'UPDATE', 'DELETE']
      },
      subscriber_table_name: {
        type: 'string',
        description:
          'Custom name for the subscriber table (defaults to {source_table}_subscriber)'
      },
      ephemeral: {
        type: 'boolean',
        description:
          'When true, events are delivered via pg_notify only without ' +
          'writing to change_log. Ideal for high-frequency ephemeral ' +
          'signals (e.g. cursor positions, live indicators) where ' +
          'persistence is unnecessary. Subscriber table and RLS ' +
          'policies are still created for access control.',
        default: false
      }
    }
  },
  tags: ['realtime', 'subscriptions', 'triggers']
};
