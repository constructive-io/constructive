import type { Request } from 'express';

import { resolveProxyHops } from '../client-ip';

const behindTrustProxy = { app: { get: () => true } } as unknown as Request;
const noTrustProxy = { app: { get: () => false } } as unknown as Request;

describe('resolveProxyHops', () => {
  const saved = process.env.TRUSTED_PROXY_HOPS;
  afterEach(() => {
    if (saved === undefined) delete process.env.TRUSTED_PROXY_HOPS;
    else process.env.TRUSTED_PROXY_HOPS = saved;
  });

  it('treats an explicit TRUSTED_PROXY_HOPS=0 as no hops, even with SERVER_TRUST_PROXY', () => {
    process.env.TRUSTED_PROXY_HOPS = '0';
    expect(resolveProxyHops(behindTrustProxy)).toBe(0);
  });

  it('uses one hop under SERVER_TRUST_PROXY when TRUSTED_PROXY_HOPS is unset', () => {
    delete process.env.TRUSTED_PROXY_HOPS;
    expect(resolveProxyHops(behindTrustProxy)).toBe(1);
    expect(resolveProxyHops(noTrustProxy)).toBe(0);
  });

  it('prefers TRUSTED_PROXY_HOPS over SERVER_TRUST_PROXY when set', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(resolveProxyHops(behindTrustProxy)).toBe(2);
    expect(resolveProxyHops(noTrustProxy)).toBe(2);
  });

  it('prefers an explicit count over the environment', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(resolveProxyHops(behindTrustProxy, 0)).toBe(0);
  });
});
