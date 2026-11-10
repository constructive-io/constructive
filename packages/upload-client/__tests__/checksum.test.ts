import { createHash } from 'crypto';

import { CHECKSUM_SHA256_HEADER, presignedPutHeaders, sha256HexOfBody, sha256HexToBase64 } from '../src/checksum';

describe('sha256HexToBase64', () => {
  it('encodes the raw digest bytes, not the hex string', () => {
    const hex = createHash('sha256').update('hello').digest('hex');
    const expected = createHash('sha256').update('hello').digest('base64');
    expect(sha256HexToBase64(hex)).toBe(expected);
    expect(sha256HexToBase64(hex)).toHaveLength(44);
    expect(sha256HexToBase64(hex)).not.toBe(Buffer.from(hex).toString('base64'));
  });

  it('rejects anything that is not a 64-char hex digest', () => {
    expect(() => sha256HexToBase64('abc')).toThrow(/Invalid SHA-256/);
    expect(() => sha256HexToBase64('z'.repeat(64))).toThrow(/Invalid SHA-256/);
  });
});

describe('presignedPutHeaders', () => {
  const hex = 'a'.repeat(64);

  it('adds the signed checksum header when the hash is known', () => {
    expect(presignedPutHeaders('text/plain', hex)).toEqual({
      'Content-Type': 'text/plain',
      [CHECKSUM_SHA256_HEADER]: sha256HexToBase64(hex),
    });
  });

  it('sends only Content-Type when there is no hash', () => {
    expect(presignedPutHeaders('text/plain')).toEqual({ 'Content-Type': 'text/plain' });
  });
});

describe('sha256HexOfBody', () => {
  const expected = createHash('sha256').update('hello').digest('hex');

  it('hashes in-memory bodies of every shape the same way', async () => {
    const bytes = new TextEncoder().encode('hello');
    expect(await sha256HexOfBody('hello')).toBe(expected);
    expect(await sha256HexOfBody(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))).toBe(expected);
    expect(await sha256HexOfBody(bytes)).toBe(expected);
    expect(await sha256HexOfBody(Buffer.from('hello'))).toBe(expected);
    expect(await sha256HexOfBody(new Blob(['hello']))).toBe(expected);
  });

  it('declines a body it cannot read up front', async () => {
    expect(await sha256HexOfBody(new ReadableStream())).toBeUndefined();
    expect(await sha256HexOfBody(undefined)).toBeUndefined();
  });
});
