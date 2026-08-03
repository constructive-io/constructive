import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface CreateSignedStateOptions {
  secret: string;
  maxAgeMs: number;
}

export interface VerifySignedStateOptions {
  secret?: string | null;
}

export type SignedStatePayload<TPayload extends object> = TPayload & {
  nonce: string;
  exp: number;
};

function assertSecret(secret: string | null | undefined): asserts secret is string {
  if (!secret) {
    throw new Error('OAuth state secret is required');
  }
}

function signPayload(json: string, secret: string): string {
  return createHmac('sha256', secret).update(json).digest('base64url');
}

export function createSignedState<TPayload extends object>(
  payload: TPayload,
  options: CreateSignedStateOptions,
): string {
  assertSecret(options.secret);

  const data: SignedStatePayload<TPayload> = {
    ...payload,
    nonce: randomBytes(16).toString('hex'),
    exp: Date.now() + options.maxAgeMs,
  };
  const json = JSON.stringify(data);
  const signature = signPayload(json, options.secret);

  return `${Buffer.from(json).toString('base64url')}.${signature}`;
}

export function verifySignedState<TPayload extends object>(
  state: string | null | undefined,
  options: VerifySignedStateOptions,
): SignedStatePayload<TPayload> | null {
  if (!state || !options.secret) return null;

  try {
    const [payloadB64, signature] = state.split('.');
    if (!payloadB64 || !signature) return null;

    const json = Buffer.from(payloadB64, 'base64url').toString();
    const expectedSignature = signPayload(json, options.secret);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
      return null;
    }

    const data = JSON.parse(json) as SignedStatePayload<TPayload>;
    if (typeof data.exp !== 'number' || data.exp < Date.now()) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
