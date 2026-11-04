import type { Request, Response } from 'express';

import type { ApiStructure } from '../../types';
import { cors } from '../cors';

const request = (origin: string | undefined, api: Partial<ApiStructure> = {}, method = 'OPTIONS') => ({
  method,
  headers: { origin, 'access-control-request-headers': 'content-type,x-csrf-token' },
  api
} as unknown as Request);

const response = () => {
  const headers = new Map<string, string>();
  const res = {
    getHeader: (name: string) => headers.get(name.toLowerCase()),
    setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value),
    vary: (name: string) => headers.set('vary', name),
    status: jest.fn().mockReturnThis(),
    end: jest.fn()
  };
  return { headers, res: res as unknown as Response, end: res.end };
};

describe('CORS origin matching and preflight termination', () => {
  it.each([
    ['typed API origin', 'https://client.example', { corsOrigins: ['https://client.example'] }, undefined, true],
    ['routed domain origin', 'https://site.example', { domains: ['https://site.example'] }, undefined, true],
    ['exact fallback', 'https://fallback.example', {}, ' https://fallback.example ', true],
    ['API origin after unmatched fallback', 'https://client.example', { corsOrigins: ['https://client.example'] }, 'https://fallback.example', true],
    ['explicit wildcard', 'https://unlisted.example', {}, ' * ', true],
    ['localhost', 'http://localhost:3000', {}, undefined, true],
    ['localhost subdomain', 'http://app.localhost:3000', {}, undefined, true],
    ['localhost suffix lookalike', 'https://localhost.attacker.example', {}, undefined, false],
    ['origin prefix lookalike', 'https://client.example.attacker.example', { corsOrigins: ['https://client.example'] }, undefined, false],
    ['different scheme', 'http://client.example', { corsOrigins: ['https://client.example'] }, undefined, false],
    ['different port', 'https://client.example:444', { corsOrigins: ['https://client.example'] }, undefined, false],
    ['empty allowlist', 'https://client.example', { corsOrigins: [] }, undefined, false],
    ['missing metadata', 'https://client.example', {}, undefined, false],
    ['malformed origin', 'not-a-url', {}, undefined, false],
    ['opaque origin', 'null', {}, undefined, false],
    ['absent origin', undefined, {}, undefined, false]
  ] as const)('%s', (_label, origin, api, fallback, allowed) => {
    const { res, headers, end } = response();
    const next = jest.fn();
    cors(fallback)(request(origin, api as Partial<ApiStructure>), res, next);
    expect(headers.get('access-control-allow-origin')).toBe(allowed ? origin : undefined);
    expect(headers.get('access-control-allow-credentials')).toBe(allowed ? 'true' : undefined);
    expect(headers.get('vary')).toContain('Origin');
    expect(end).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['https://client.example', 'https://unlisted.example', undefined])(
    'passes actual requests from %j to authentication even without a CORS grant', (origin) => {
      const { res, end } = response();
      const next = jest.fn();
      cors()(request(origin, { corsOrigins: ['https://client.example'] }, 'POST'), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(end).not.toHaveBeenCalled();
    }
  );
});
