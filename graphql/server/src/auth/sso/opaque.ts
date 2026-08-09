import { createHash, randomBytes } from 'node:crypto';

const OPAQUE_BYTES = 32;

/** Create a high-entropy browser value while persisting only its digest. */
export const createOpaqueMaterial = (): { value: string; hash: string } => {
  const value = randomBytes(OPAQUE_BYTES).toString('base64url');
  return { value, hash: hashOpaqueValue(value) };
};

/** PostgreSQL bytea hex input for an opaque browser-held value. */
export const hashOpaqueValue = (value: string): string =>
  `\\x${createHash('sha256').update(value, 'utf8').digest('hex')}`;
