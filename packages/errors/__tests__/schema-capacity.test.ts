import { errors, httpStatusFor, toError } from '../src';

it('classifies schema capacity refusal without exposing runtime details', () => {
  const error = errors.SCHEMA_CAPACITY_EXHAUSTED();
  expect(error.isPublic).toBe(false);
  expect(httpStatusFor(error.code)).toEqual({ status: 503, mapped: true });
  expect(toError(error).code).toBe('SCHEMA_CAPACITY_EXHAUSTED');
  expect(error.context).toBeUndefined();
});
