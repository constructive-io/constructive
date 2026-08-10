import type { NodeTypeDefinition } from '../types';

export const DataCapabilities: NodeTypeDefinition = {
  name: 'DataCapabilities',
  slug: 'data_capabilities',
  category: 'data',
  display_name: 'Row Capabilities',
  description: 'Per-row required permissions. A profile compiles a person to bits so no policy joins a profiles table; this compiles a row to bits so no policy joins a grant table either — the row carries the mask an actor must hold, and an AuthzEntityMembership policy with mask_column checks it as one bitwise subset test against the SPRT. The mask only narrows: it takes access away from someone membership already lets in, and never grants access to a non-member. Zero requires nothing, which is what an unclassified row defaults to. In direct mode the writer sets the mask and the subset guard bounds it to bits the writer holds; in derived mode it is copied from a mapping row (classification -> mask) by generated triggers, so authors edit one classification instead of every document.',
  parameter_schema: {
    type: 'object',
    properties: {
      field: {
        type: 'string',
        format: 'column-ref',
        description: 'Name of the bit(n) mask column to create on this table.',
        default: 'required_capabilities'
      },
      capabilities: {
        type: 'string',
        description: 'Selects the capabilities module whose bit numbering the mask is measured in, by scope (e.g. "app", "org") or by table prefix. Required only when the database has more than one; several with no selector raises naming the candidates.'
      },
      default: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Capability names every row requires unless told otherwise, resolved to a literal mask and baked into the column default. Omitted means a zero mask: requires nothing.'
      },
      mode: {
        type: 'string',
        enum: ['direct', 'derived'],
        description: 'Who writes the mask: "direct" the writer, bounded by the subset guard; "derived" the mapping row named by from_column, stamped by generated triggers and hidden from mutations.',
        default: 'direct'
      },
      from_column: {
        type: 'string',
        format: 'column-ref',
        description: 'Derived mode only: the column on this table naming the mapping row to copy the mask from (e.g. classification_id).'
      },
      mapping_table: {
        type: 'string',
        description: 'Derived mode only: table holding one mask per class (e.g. document_classifications).'
      },
      mapping_key: {
        type: 'string',
        format: 'column-ref',
        description: 'Derived mode only: column on the mapping table that from_column matches.',
        default: 'id'
      },
      mapping_column: {
        type: 'string',
        format: 'column-ref',
        description: "Derived mode only: the mapping table's own bit(n) mask column. Created when absent, so a classification table needs no DataCapabilities declaration of its own. Defaults to the same name as field."
      },
      subset_guard: {
        type: 'boolean',
        description: 'Direct mode only: refuse a write requiring bits the writer does not hold, so nobody can lock a row away from everyone including themselves. Off is for trusted-writer tables only.',
        default: true
      },
      entity_field: {
        type: 'string',
        format: 'column-ref',
        description: "Direct mode only: the entity column the subset guard's membership check reads.",
        default: 'entity_id'
      }
    }
  },
  tags: [
    'capabilities',
    'authz',
    'rls',
    'schema'
  ]
};
