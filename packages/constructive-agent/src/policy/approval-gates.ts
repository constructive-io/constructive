import type { PolicyDecision } from '../types/policy';

export function requiresApproval(decision: PolicyDecision): boolean {
  return decision.action === 'needs_approval';
}

export function isDenied(decision: PolicyDecision): boolean {
  return decision.action === 'deny';
}

export function isAllowed(decision: PolicyDecision): boolean {
  return decision.action === 'allow';
}
