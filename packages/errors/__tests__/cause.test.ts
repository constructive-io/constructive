import { ConstructiveError, errors, normalizeError } from '../src';

it('retains the original internal cause without serializing it into extensions', () => {
  const cause = new Error('private database credential');
  const error = new ConstructiveError({
    code: 'INTERNAL_FAILURE', message: 'Internal failure', errorClass: 'internal', http: 500, cause
  });
  expect(error.cause).toBe(cause);
  expect(JSON.stringify(error.toExtensions())).not.toContain(cause.message);
  expect(JSON.stringify(error)).not.toContain(cause.message);
});

it('maps unknown errors to a safe internal result with the original cause', () => {
  const original = new Error('password=private tenant=secret');
  const normalized = normalizeError(original);
  expect(normalized.code).toBe('INTERNAL_FAILURE');
  expect(normalized.http).toBe(500);
  expect(normalized.cause).toBe(original);
  expect(normalized.message).not.toContain('private');
  expect(JSON.stringify(normalized.toExtensions())).not.toContain('secret');
});

it('removes overridden messages and context from canonical internal failures', () => {
  const original = errors.INTERNAL_FAILURE({ details: 'password=private' }, 'secret stack');
  const normalized = normalizeError(original);
  expect(normalized.cause).toBe(original);
  expect(normalized.message).not.toContain('secret');
  expect(normalized.toExtensions()).not.toHaveProperty('context');
});

it('preserves a registered refusal status and code without exposing a message override', () => {
  const original = errors.FORBIDDEN({}, 'private implementation detail');
  const normalized = normalizeError(original);
  expect(normalized.code).toBe('FORBIDDEN');
  expect(normalized.http).toBe(403);
  expect(normalized.cause).toBe(original);
  expect(normalized.message).not.toContain('private');
});
