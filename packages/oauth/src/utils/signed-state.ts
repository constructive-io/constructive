import { errors } from '@constructive-io/errors';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface CreateSignedStateOptions {
  secret: string;
  maxAgeMs: number;
  now?: number;
}

export interface VerifySignedStateOptions {
  secret: string;
  now?: number;
}

export type SignedStatePayload<TPayload extends object> = TPayload & {
  nonce: string;
  exp: number;
};

function signPayload(json: string, secret: string): string {
  return createHmac('sha256', secret).update(json).digest('base64url');
}

export function createSignedState<TPayload extends object>(
  payload: TPayload,
  options: CreateSignedStateOptions
): string {
  if (!options.secret) throw errors.OAUTH_STATE_SECRET_NOT_CONFIGURED();
  if (!Number.isFinite(options.maxAgeMs) || options.maxAgeMs <= 0) {
    throw errors.INVALID_OAUTH_STATE();
  }

  const data: SignedStatePayload<TPayload> = {
    ...payload,
    nonce: randomBytes(16).toString('base64url'),
    exp: (options.now ?? Date.now()) + options.maxAgeMs,
  };
  const json = JSON.stringify(data);
  return `${Buffer.from(json).toString('base64url')}.${signPayload(json, options.secret)}`;
}

export function verifySignedState<TPayload extends object>(
  state: string | null | undefined,
  options: VerifySignedStateOptions
): SignedStatePayload<TPayload> | null {
  if (!state || !options.secret) return null;
  const segments = state.split('.');
  if (segments.length !== 2) return null;
  const [payloadB64, signature] = segments;
  if (!payloadB64 || !signature) return null;

  const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const expected = Buffer.from(signPayload(json, options.secret), 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;

  let data: SignedStatePayload<TPayload>;
  try {
    data = JSON.parse(json) as SignedStatePayload<TPayload>;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    typeof data.nonce !== 'string' ||
    data.nonce.length === 0 ||
    typeof data.exp !== 'number' ||
    data.exp <= (options.now ?? Date.now())
  ) {
    return null;
  }
  return data;
}
