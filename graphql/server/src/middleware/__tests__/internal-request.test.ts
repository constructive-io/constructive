import type { Request } from 'express';

import type { ApiOptions } from '../../types';
import {
  assertInternalRequestSecret,
  authorizeInternalRequest,
  INTERNAL_REQUEST_TOKEN_HEADER
} from '../internal-request';

const SECRET = '0123456789abcdef0123456789abcdef';

const request = (headers: Record<string, string>): Request => {
  const normalized = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    get: jest.fn((name: string) => normalized.get(name.toLowerCase()))
  } as unknown as Request;
};

const options = (isPublic: boolean, secret: string | undefined = SECRET): ApiOptions => ({
  api: {
    isPublic,
    ...(secret === undefined ? {} : { internalRequestSecret: secret })
  }
} as ApiOptions);

describe('internal request boundary', () => {
  it('allows ordinary requests without granting internal trust', () => {
    const req = request({ host: 'api.example.com' });

    authorizeInternalRequest(options(true), req);

    expect(req.internalTrusted).toBe(false);
  });

  it('authenticates a token-only administrative request in constant-time path', () => {
    const req = request({ [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET });

    authorizeInternalRequest(options(true), req);

    expect(req.internalTrusted).toBe(true);
  });

  it('rejects private actor claims without the internal token', () => {
    const req = request({ 'X-Actor-Id': 'actor-a' });

    expect(() => authorizeInternalRequest(options(false), req)).toThrow(
      expect.objectContaining({ code: 'INTERNAL_REQUEST_FORBIDDEN' })
    );
    expect(req.internalTrusted).toBe(false);
  });

  it('accepts private API and actor selectors only with the exact token', () => {
    const req = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Database-Id': 'database-a',
      'X-Api-Name': 'api-a',
      'X-Actor-Id': 'actor-a'
    });

    authorizeInternalRequest(options(false), req);

    expect(req.internalTrusted).toBe(true);
  });

  it('rejects private selectors on a public ingress even with the exact token', () => {
    const req = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Database-Id': 'database-a',
      'X-Api-Name': 'api-a'
    });

    expect(() => authorizeInternalRequest(options(true), req)).toThrow(
      expect.objectContaining({ code: 'INTERNAL_REQUEST_FORBIDDEN' })
    );
    expect(req.internalTrusted).toBe(false);
  });

  it('always rejects caller-supplied physical schemas', () => {
    const req = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Database-Id': 'database-a',
      'X-Schemata': 'tenant_b_public'
    });

    expect(() => authorizeInternalRequest(options(false), req)).toThrow(
      expect.objectContaining({ code: 'INTERNAL_REQUEST_FORBIDDEN' })
    );
    expect(req.internalTrusted).toBe(false);
  });

  it('rejects the privileged metadata surface unless explicitly enabled', () => {
    const req = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Database-Id': 'database-a',
      'X-Meta-Schema': 'true'
    });

    expect(() => authorizeInternalRequest(options(false), req)).toThrow(
      expect.objectContaining({ code: 'INTERNAL_REQUEST_FORBIDDEN' })
    );
    expect(req.internalTrusted).toBe(false);
  });

  it('allows the privileged metadata surface only under an explicit private-ingress gate', () => {
    const opts = options(false);
    opts.api!.allowMetaSchemaHeader = true;
    const req = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Database-Id': 'database-a',
      'X-Meta-Schema': 'true'
    });

    authorizeInternalRequest(opts, req);

    expect(req.internalTrusted).toBe(true);
  });

  it('rejects missing and conflicting private-selector identities', () => {
    const opts = options(false);
    opts.api!.allowMetaSchemaHeader = true;
    const missingDatabase = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Api-Name': 'api-a'
    });
    const conflicting = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Database-Id': 'database-a',
      'X-Api-Name': 'api-a',
      'X-Meta-Schema': 'true'
    });

    expect(() => authorizeInternalRequest(opts, missingDatabase)).toThrow(
      expect.objectContaining({ code: 'INTERNAL_REQUEST_FORBIDDEN' })
    );
    expect(() => authorizeInternalRequest(opts, conflicting)).toThrow(
      expect.objectContaining({ code: 'INTERNAL_REQUEST_FORBIDDEN' })
    );
  });

  it('rejects empty reserved routing and identity values', () => {
    const blankApi = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Database-Id': 'database-a',
      'X-Api-Name': '   '
    });
    const blankActor = request({
      [INTERNAL_REQUEST_TOKEN_HEADER]: SECRET,
      'X-Actor-Id': ''
    });

    expect(() => authorizeInternalRequest(options(false), blankApi)).toThrow(
      expect.objectContaining({ code: 'INTERNAL_REQUEST_FORBIDDEN' })
    );
    expect(() => authorizeInternalRequest(options(false), blankActor)).toThrow(
      expect.objectContaining({ code: 'INTERNAL_REQUEST_FORBIDDEN' })
    );
  });

  it('rejects short configured secrets at startup', () => {
    expect(() => assertInternalRequestSecret(options(false, 'too-short'))).toThrow(
      'at least 32 bytes'
    );
    expect(() => assertInternalRequestSecret(options(false, undefined))).not.toThrow();
  });
});
