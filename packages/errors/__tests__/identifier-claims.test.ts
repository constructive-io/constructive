import { readFileSync } from 'fs';
import { join } from 'path';

import { classify, errors, format, getDefinition, httpStatusFor, toError } from '../src';
import { generatedRegistry } from '../src/generated/registry.generated';

const inventory: Record<string, unknown> = JSON.parse(
  readFileSync(join(__dirname, '../scripts/db-error-inventory.json'), 'utf-8')
);

const expected = [
  { code: 'IDENTIFIER_VERIFIED_ELSEWHERE', http: 409 },
  { code: 'IDENTIFIER_UNVERIFIED_AMBIGUOUS', http: 409 },
  { code: 'IDENTIFIER_CLAIM_LIMIT', http: 429 },
  { code: 'MFA_IDENTIFIER_UNVERIFIED', http: 403 },
  { code: 'SMS_VERIFICATION_DISABLED', http: 403 }
] as const;

describe('verified-only identifier claim codes', () => {
  it('are audited from constructive-db and curated as public', () => {
    for (const { code, http } of expected) {
      expect(inventory[code]).toBeDefined();
      expect(generatedRegistry[code]).toBeDefined();
      expect(classify(code)).toBe('public');
      expect(httpStatusFor(code)).toEqual({ status: http, mapped: true });
      expect(format(code)).not.toBe(code);
      expect(getDefinition(code)?.message).toMatch(/[a-z] [a-z]/);
    }
  });

  it('carries the claim limit through DETAIL context', () => {
    const err = toError({
      message: 'IDENTIFIER_CLAIM_LIMIT',
      code: 'P0001',
      detail: JSON.stringify({ code: 'IDENTIFIER_CLAIM_LIMIT', context: { limit: 3 }, class: 'public' })
    });
    expect(err).toMatchObject({
      code: 'IDENTIFIER_CLAIM_LIMIT',
      errorClass: 'public',
      http: 429,
      context: { limit: 3 }
    });
    expect(errors.IDENTIFIER_CLAIM_LIMIT({ limit: 3 }).context).toEqual({ limit: 3 });
  });
});
