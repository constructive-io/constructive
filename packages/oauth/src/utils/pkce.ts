import { errors } from '@constructive-io/errors';
import { createHash, randomBytes } from 'crypto';

const DEFAULT_CODE_VERIFIER_BYTES = 32;
const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

export function generateCodeVerifier(
  byteLength = DEFAULT_CODE_VERIFIER_BYTES
): string {
  const verifier = randomBytes(byteLength).toString('base64url');
  if (!PKCE_VERIFIER_PATTERN.test(verifier)) {
    throw errors.INVALID_OAUTH_PKCE();
  }
  return verifier;
}

export function deriveCodeChallenge(codeVerifier: string): string {
  if (!PKCE_VERIFIER_PATTERN.test(codeVerifier)) {
    throw errors.INVALID_OAUTH_PKCE();
  }
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

export function verifyCodeChallenge(
  codeVerifier: string,
  expectedChallenge: string
): boolean {
  if (!expectedChallenge) return false;
  return deriveCodeChallenge(codeVerifier) === expectedChallenge;
}
