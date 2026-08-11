import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { ProviderAdapterError } from './types';

const BASE64URL_VALUE = /^[A-Za-z0-9_-]+$/;
const PKCE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

export const generateOpaqueState = (): string => randomBytes(32).toString('base64url');

export const generateCodeVerifier = (): string => randomBytes(32).toString('base64url');

export const generateOidcNonce = (): string => randomBytes(32).toString('base64url');

export const deriveS256CodeChallenge = (verifier: string): string => {
  if (!PKCE_VERIFIER.test(verifier)) {
    throw new ProviderAdapterError(
      'INVALID_AUTHORIZATION_INPUT',
      'The PKCE verifier does not satisfy RFC 7636.'
    );
  }
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
};

export const isOpaqueOAuthValue = (value: string, byteLength = 32): boolean =>
  value.length === Math.ceil((byteLength * 4) / 3) &&
  BASE64URL_VALUE.test(value);

export const constantTimeEqual = (expected: string, actual: string): boolean => {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
};
