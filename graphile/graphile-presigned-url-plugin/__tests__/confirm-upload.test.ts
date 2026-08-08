/**
 * The presigned lane's byte check: what a `requested` row becomes once the
 * client's PUT is supposed to have landed.
 *
 * S3 is mocked at the client boundary, and the assertions are about the verdict —
 * `uploaded`, `rejected` or `expired` — since the transition itself belongs to
 * the generated SQL functions, not to this module.
 */

import { Readable } from 'stream';

import { confirmUploadedBytes } from '../src/confirm-upload';
import type { S3Config } from '../src/types';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const HTML = Buffer.from('<!DOCTYPE HTML>\n<html><body><script>alert(1)</script></body></html>');

/** An S3 whose object is `body`, or absent when `body` is null. */
function fakeS3(body: Buffer | null): { s3: S3Config; send: jest.Mock } {
  const send = jest.fn().mockImplementation(async () => {
    if (body === null) {
      const err: any = new Error('NoSuchKey');
      err.name = 'NoSuchKey';
      throw err;
    }
    return { Body: Readable.from([body]) };
  });
  return { s3: { client: { send } as any, bucket: 'myapp-default-public-db' }, send };
}

describe('confirmUploadedBytes', () => {
  it('confirms an object whose bytes match its claims', async () => {
    const { s3, send } = fakeS3(PNG);

    const verdict = await confirmUploadedBytes({
      s3,
      key: 'abc',
      declaredMime: 'image/png',
      filename: 'avatar.png',
    });

    expect(verdict).toEqual({ outcome: 'uploaded', detectedMime: 'image/png' });
    // A ranged read, not a download: the whole point of validating in confirm.
    expect(send.mock.calls[0][0].input.Range).toMatch(/^bytes=0-/);
  });

  it('rejects HTML uploaded as a JPEG', async () => {
    const { s3 } = fakeS3(HTML);

    const verdict = await confirmUploadedBytes({
      s3,
      key: 'abc',
      declaredMime: 'image/jpeg',
      filename: 'avatar.jpg',
    });

    expect(verdict.outcome).toBe('rejected');
    if (verdict.outcome === 'rejected') {
      expect(verdict.reason).toContain('image/jpeg');
    }
  });

  it('rejects an empty object, which was written but is not a file', async () => {
    const { s3 } = fakeS3(Buffer.alloc(0));

    const verdict = await confirmUploadedBytes({
      s3,
      key: 'abc',
      declaredMime: 'image/png',
      filename: 'avatar.png',
    });

    expect(verdict.outcome).toBe('rejected');
  });

  it('expires rather than rejects when the client never uploaded', async () => {
    const { s3 } = fakeS3(null);

    const verdict = await confirmUploadedBytes({
      s3,
      key: 'abc',
      declaredMime: 'image/png',
      filename: 'avatar.png',
    });

    expect(verdict.outcome).toBe('expired');
  });

  it('confirms a file whose declared type the bytes cannot refute', async () => {
    // An unrecognised binary format detects as nothing; silence is not a
    // contradiction, so a legitimate upload is not held hostage to the registry.
    const { s3 } = fakeS3(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x00, 0x00, 0x00, 0x00]));

    const verdict = await confirmUploadedBytes({
      s3,
      key: 'abc',
      declaredMime: 'application/vnd.myapp.thing',
      filename: 'data.myapp',
    });

    expect(verdict.outcome).toBe('uploaded');
  });
});
