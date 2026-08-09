import {
  buildHandoffContinuationUrl,
  createHandoffMaterial,
  hashHandoffCode
} from '../handoff';

describe('SSO handoff primitives', () => {
  it('creates 256-bit plaintext and keeps only its SHA-256 bytea digest', () => {
    const first = createHandoffMaterial();
    const second = createHandoffMaterial();

    expect(first.code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.hash).toMatch(/^\\x[0-9a-f]{64}$/);
    expect(first.hash).toBe(hashHandoffCode(first.code));
    expect(first.code).not.toBe(second.code);
  });

  it('adds only handoff and Site state to an exact HTTPS callback', () => {
    const result = buildHandoffContinuationUrl(
      'https://portal.example.com/auth/complete?locale=en',
      's'.repeat(43),
      'h'.repeat(43)
    );
    const callback = new URL(result);

    expect(callback.origin).toBe('https://portal.example.com');
    expect(callback.pathname).toBe('/auth/complete');
    expect(callback.searchParams.get('locale')).toBe('en');
    expect(callback.searchParams.get('handoff')).toBe('h'.repeat(43));
    expect(callback.searchParams.get('site_state')).toBe('s'.repeat(43));
  });

  it('fails closed for non-HTTPS or reserved callback parameters', () => {
    expect(() => buildHandoffContinuationUrl(
      'http://portal.example.com/auth/complete',
      's'.repeat(43),
      'h'.repeat(43)
    )).toThrow();
    expect(() => buildHandoffContinuationUrl(
      'https://portal.example.com/auth/complete?handoff=attacker',
      's'.repeat(43),
      'h'.repeat(43)
    )).toThrow();
  });

  it('rejects malformed redemption codes before hashing', () => {
    expect(() => hashHandoffCode('short')).toThrow();
  });
});
