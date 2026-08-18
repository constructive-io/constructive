import type { NodeTypeDefinition } from '../types';

export const DataLock: NodeTypeDefinition = {
  name: 'DataLock',
  slug: 'data_lock',
  category: 'data',
  display_name: 'Row Lock',
  description:
    'Adds a boolean lock column and guards mutations while a row is locked, ' +
    'so infrastructure rows other things depend on (a bucket a function needs, ' +
    'a route, a resource) are not deleted or edited by accident. Two ' +
    'enforcement modes: step_up requires recent strong verification (via ' +
    'GuardStepUp / require_step_up) for the guarded verbs, while block refuses ' +
    'them outright until the row is unlocked. Clearing the lock is itself ' +
    'step-up guarded, so unlocking is a deliberate, re-authenticated step ' +
    'rather than a silent prelude to deletion.',
  parameter_schema: {
    type: 'object',
    properties: {
      lock_field: {
        type: 'string',
        format: 'column-ref',
        description: 'Boolean column holding the lock state',
        default: 'locked'
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['UPDATE', 'DELETE']
        },
        description:
          'Which DML events are guarded while the row is locked. INSERT is ' +
          'not lockable — a row cannot be locked before it exists.',
        default: ['DELETE']
      },
      enforcement: {
        type: 'string',
        enum: ['step_up', 'block'],
        description:
          'How a guarded verb is stopped while locked. step_up requires ' +
          'recent strong verification (needs a provisioned user_auth_module); ' +
          'block refuses the verb outright with ROW_LOCKED until unlocked.',
        default: 'step_up'
      },
      step_up_type: {
        type: 'string',
        enum: ['password', 'mfa', 'fresh_auth'],
        description:
          'Verification method satisfying the step-up requirement, for the ' +
          'guarded verbs in step_up mode and for clearing the lock',
        default: 'fresh_auth'
      },
      guard_unlock: {
        type: 'boolean',
        description:
          'Require step-up to change the lock column itself, so a locked row ' +
          'cannot be quietly unlocked and then deleted. Redundant (and ' +
          'therefore skipped) in step_up mode when UPDATE is already guarded.',
        default: true
      },
      protect_fields: {
        type: 'array',
        items: {
          type: 'string',
          format: 'column-ref'
        },
        description:
          'For a guarded UPDATE, restrict the guard to changes touching these ' +
          'columns. Empty guards the whole row.',
        default: []
      },
      default_locked: {
        type: 'boolean',
        description: 'Initial value of the lock column for new rows',
        default: false
      },
      min_age: {
        type: 'string',
        description:
          'Optional interval (e.g. "24 hours"); in step_up mode the guard ' +
          'only fires for rows older than this, so freshly created rows stay ' +
          'easy to clean up. Empty guards rows of any age.',
        default: ''
      }
    }
  },
  tags: ['lock', 'guard', 'triggers', 'security', 'schema']
};
