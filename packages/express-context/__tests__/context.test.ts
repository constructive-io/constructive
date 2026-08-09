import type { Request } from 'express';

import { resolveRequestOrigin } from '../src';

describe('resolveRequestOrigin', () => {
  it('derives the routed HTTPS request origin', () => {
    const request = {
      protocol: 'https',
      get: (name: string) => name === 'host' ? 'auth.example.com:8443' : undefined
    } as unknown as Request;
    expect(resolveRequestOrigin(request)).toBe('https://auth.example.com:8443');
  });

  it('rejects malformed request hosts', () => {
    const request = {
      protocol: 'https',
      get: () => 'bad host'
    } as unknown as Request;
    expect(resolveRequestOrigin(request)).toBeNull();
  });
});
