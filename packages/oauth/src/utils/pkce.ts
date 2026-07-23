import { createHash, randomBytes } from 'crypto';

const DEFAULT_CODE_VERIFIER_BYTES = 32;

export function generateCodeVerifier(
  byteLength = DEFAULT_CODE_VERIFIER_BYTES,
): string {
  return randomBytes(byteLength).toString('base64url');
}

export function deriveCodeChallenge(codeVerifier: string): string {
  if (!codeVerifier) {
    throw new Error('PKCE code verifier is required');
  }

  return createHash('sha256').update(codeVerifier).digest('base64url');
}
