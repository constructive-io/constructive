import type { NodeTypeDefinition } from '../types';

export const CheckOwnedRelation: NodeTypeDefinition = {
  name: 'CheckOwnedRelation',
  slug: 'check_owned_relation',
  category: 'check',
  display_name: 'Check Owned Relation',
  description: 'Declares that typed pointer columns may only reference rows owned by the same scope owner as the referencing row, proven through a link table that carries the owner (owner_scope, owner_key) — typically a catalog projection that must never be referenced structurally. Creates one BEFORE INSERT OR UPDATE trigger enforcing the declared arity over the pointers and requiring every pointer that is set to resolve to a same-owner row, so it covers belongs-to / has-one / has-many (key on the row being written) and has-and-belongs-to-many (both keys on the junction row, arity all). Visibility/publication flags are never an authorization input.',
  parameter_schema: {
    type: 'object',
    properties: {
      link_schema_name: {
        type: 'string',
        description: 'Schema holding the link tables the ownership is proven through (e.g. catalog_private)'
      },
      owner_scope: {
        type: 'string',
        description: "Scope that owns the referencing rows; matched against the link row's owner_scope (e.g. database, platform)"
      },
      owner_key_field_name: {
        type: 'string',
        format: 'column-ref',
        description: "Column on the referencing table carrying its scope key, matched against the link row's owner_key. NULL for a global scope, whose owner key is NULL by construction"
      },
      pointers: {
        type: 'array',
        description: 'Typed pointer columns to guard, each resolved through its own link table',
        items: {
          type: 'object',
          properties: {
            field_name: {
              type: 'string',
              format: 'column-ref',
              description: 'Pointer column on the referencing table'
            },
            link_table_name: {
              type: 'string',
              description: 'Link table in link_schema_name whose ids this column points at'
            },
            target_type_field_name: {
              type: 'string',
              description: 'Optional link column additionally restricted regardless of ownership (e.g. a bucket type)'
            },
            target_type_value: {
              type: 'string',
              description: 'Value target_type_field_name must equal'
            },
            allow_owner_tier: {
              type: 'boolean',
              description: "Admit the same database's global-scope rows (app/platform, ownerless by construction) for this column, for pointers whose legal target set is a scope hierarchy within one database",
              default: false
            }
          },
          required: ['field_name', 'link_table_name']
        }
      },
      arity: {
        type: 'string',
        enum: ['exactly_one', 'all', 'any'],
        description:
          'How many pointers a row must set: exactly_one for a polymorphic target (route → api OR site OR bucket), all for a junction/join row of a has-and-belongs-to-many relation (and for a mandatory belongs-to), any for optional pointers that are only checked when set',
        default: 'exactly_one'
      },
      required_error: {
        type: 'string',
        description: 'Error code raised when the arity rule over the pointers is violated',
        default: 'OWNED_RELATION_TARGET_REQUIRED'
      },
      denied_error: {
        type: 'string',
        description: 'Error code raised when the target is not owned by the referencing row owner',
        default: 'OWNED_RELATION_TARGET_NOT_OWNED'
      },
      trigger_function_schema: {
        type: 'string',
        description: 'Schema the guard trigger function is created in; defaults to the table schema'
      },
      trigger_function_name: {
        type: 'string',
        description:
          'Guard trigger function name; defaults to tg_<table>_owned_relation_guard'
      },
      trigger_name: {
        type: 'string',
        description: 'Guard trigger name; defaults to <table>_owned_relation_guard'
      }
    },
    required: [
      'link_schema_name',
      'owner_scope',
      'pointers'
    ]
  },
  tags: [
    'check',
    'validation',
    'ownership',
    'relation',
    'trigger'
  ]
};
