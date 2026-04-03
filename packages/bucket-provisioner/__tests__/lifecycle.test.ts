/**
 * Tests for lifecycle rule builders.
 */

import { buildTempCleanupRule, buildAbortIncompleteMultipartRule } from '../src/lifecycle';

describe('buildTempCleanupRule', () => {
  it('builds rule with default 1-day expiration', () => {
    const rule = buildTempCleanupRule();
    expect(rule.id).toBe('temp-cleanup');
    expect(rule.prefix).toBe('');
    expect(rule.expirationDays).toBe(1);
    expect(rule.enabled).toBe(true);
  });

  it('builds rule with custom expiration days', () => {
    const rule = buildTempCleanupRule(7);
    expect(rule.expirationDays).toBe(7);
  });

  it('builds rule with custom prefix', () => {
    const rule = buildTempCleanupRule(1, 'tmp/');
    expect(rule.prefix).toBe('tmp/');
  });

  it('returns enabled: true by default', () => {
    const rule = buildTempCleanupRule(30);
    expect(rule.enabled).toBe(true);
  });
});

describe('buildAbortIncompleteMultipartRule', () => {
  it('builds rule with default 1-day threshold', () => {
    const rule = buildAbortIncompleteMultipartRule();
    expect(rule.id).toBe('abort-incomplete-multipart');
    expect(rule.prefix).toBe('');
    expect(rule.expirationDays).toBe(1);
    expect(rule.enabled).toBe(true);
  });

  it('builds rule with custom days', () => {
    const rule = buildAbortIncompleteMultipartRule(3);
    expect(rule.expirationDays).toBe(3);
  });

  it('returns enabled: true by default', () => {
    const rule = buildAbortIncompleteMultipartRule(5);
    expect(rule.enabled).toBe(true);
  });
});
