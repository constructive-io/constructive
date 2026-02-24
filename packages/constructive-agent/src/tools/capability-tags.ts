import type { CapabilityTag } from '../types/tools';

export const CAPABILITY_TAGS: CapabilityTag[] = [
  'read',
  'write',
  'destructive',
  'admin',
  'integration',
  'unsafe',
];

export function isWriteCapability(capability: CapabilityTag): boolean {
  return capability === 'write' || capability === 'destructive';
}

export function isPrivilegedCapability(capability: CapabilityTag): boolean {
  return capability === 'admin' || capability === 'unsafe';
}
