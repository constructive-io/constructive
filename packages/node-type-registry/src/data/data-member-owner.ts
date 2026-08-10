import type { NodeTypeDefinition } from '../types';

export const DataMemberOwner: NodeTypeDefinition = {
  name: 'DataMemberOwner',
  slug: 'data_member_owner',
  category: 'data',
  display_name: 'Member Owner',
  description: 'Adds owner_id and entity_id columns with a compound AuthzMemberOwner policy. The actor must own the row (owner_id = current_user_id()) AND be a member of the entity (entity_id in SPRT). Use for private data within an entity scope — e.g., personal chat threads that belong to the company but only the author can see.',
  parameter_schema: {
    type: 'object',
    properties: {
      owner_field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the owner reference',
        default: 'owner_id'
      },
      entity_field_name: {
        type: 'string',
        format: 'column-ref',
        description: 'Column name for the entity reference',
        default: 'entity_id'
      },
      include_id: {
        type: 'boolean',
        description: 'If true, also adds a UUID primary key column with auto-generation',
        default: true
      },
      include_user_fk: {
        type: 'boolean',
        description: 'If true, adds foreign key constraints from owner_id and entity_id to the users table',
        default: true
      },
      create_index: {
        type: 'boolean',
        description: 'If true, creates B-tree indexes on the owner and entity columns',
        default: true
      },
      entity_type: {
        type: 'string',
        description: "Scope name for SPRT resolution (e.g. 'org', 'room'). Resolved to a membership type via the database's membership_types_module. This is the authoring form — use it instead of membership_type."
      },
      membership_type: {
        type: 'integer',
        description: 'Resolved membership type for SPRT resolution. Internal: prefer entity_type. Cannot be combined with entity_type.',
        default: null
      }
    }
  },
  tags: [
    'ownership',
    'membership',
    'security',
    'schema'
  ]
};
