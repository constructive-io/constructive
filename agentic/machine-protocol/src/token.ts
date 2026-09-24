/**
 * How an enrollment token is stored and compared.
 *
 * The `machine` row keeps a hash, never the token: the runner holds the only
 * copy of the secret, and a database dump of the machines table hands out no
 * shells. Enrollment hashes the token it generated with this function, and the
 * relay hashes what a socket presented and compares the two — in constant time,
 * so the comparison leaks nothing about how much of a prefix matched.
 */

import { createHash, timingSafeEqual } from 'crypto';

/** The hash stored in `machine.token_hash` for an enrollment token. */
export function hashMachineToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Constant-time comparison of two token hashes. */
export function machineTokenHashMatches(expected: string, presented: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(presented, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
