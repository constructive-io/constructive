import type { CapabilityPolicyMap } from './policy-engine';

export const DEFAULT_CAPABILITY_POLICY: CapabilityPolicyMap = {
  read: {
    action: 'allow',
    reason: 'Read-only tools are allowed by default.',
  },
  write: {
    action: 'needs_approval',
    reason: 'Write tools require explicit approval in the default policy.',
  },
  destructive: {
    action: 'needs_approval',
    reason: 'Destructive tools require explicit approval.',
    riskClass: 'destructive',
  },
  admin: {
    action: 'deny',
    reason: 'Administrative tools are denied by default.',
  },
  integration: {
    action: 'needs_approval',
    reason: 'Integration tools require approval by default.',
  },
  unsafe: {
    action: 'deny',
    reason: 'Unsafe tools are denied by default.',
  },
};
