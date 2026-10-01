import { conditionDefs, conditionProperties } from '../conditions';
import type { NodeTypeDefinition } from '../types';

export const GuardStepUp: NodeTypeDefinition = {
  name: 'GuardStepUp',
  slug: 'guard_step_up',
  category: 'guard',
  display_name: 'Guard Step-Up',
  description:
    'Attaches a BEFORE trigger that calls require_step_up() to enforce recent ' +
    'strong verification (password, MFA, or identity-provider assertion) before ' +
    'allowing mutations. Requires a ' +
    'provisioned sessions_module (with app_settings_auth) for the target database. ' +
    'The step_up_window is read from app_settings_auth at runtime (default 30 minutes). ' +
    'Supports compound conditions (AND/OR/NOT), watch_fields (fire only when specific ' +
    'fields change), and simple condition_field/condition_value leaf conditions.',
  parameter_schema: {
    type: 'object',
    $defs: conditionDefs,
    properties: {
      step_up_type: {
        type: 'string',
        enum: ['password', 'mfa', 'fresh_auth', 'password_or_mfa'],
        description:
          'Which recent proof satisfies the step-up requirement: password ' +
          '(password re-entry), mfa (second factor), password_or_mfa (either ' +
          'factor; an SSO sign-in alone does not count), or fresh_auth (any ' +
          'recent sign-in or re-verification, including SSO, magic link and OTP)',
        default: 'fresh_auth',
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['INSERT', 'UPDATE', 'DELETE'],
        },
        description: 'Which DML events require step-up verification',
        default: ['UPDATE', 'DELETE'],
      },
      ...conditionProperties,
    },
    required: [],
  },
  tags: ['guard', 'triggers', 'auth', 'step-up', 'mfa', 'security'],
};
