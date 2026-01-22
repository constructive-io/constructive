import { randomBytes } from 'crypto';

export function generateState(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function verifyState(expected: string | undefined, actual: string | undefined): boolean {
  if (!expected || !actual) return false;
  if (expected.length !== actual.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }
  return result === 0;
}
