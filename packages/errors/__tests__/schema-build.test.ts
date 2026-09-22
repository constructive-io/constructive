import { errors, httpStatusFor, toError } from '../src';

it.each(['SCHEMA_BUILD_INVALIDATED', 'SCHEMA_BUILDS_CLOSED', 'SCHEMA_BUILD_STUCK', 'SCHEMA_BUILD_QUEUE_FULL', 'SCHEMA_BUILD_DRAIN_TIMEOUT'] as const)(
  '%s preserves a safe build lifecycle refusal', (code) => {
    const error = errors[code]({});
    expect(error.isPublic).toBe(false);
    expect(httpStatusFor(error.code)).toEqual({ status: 503, mapped: true });
    expect(toError(error).code).toBe(code);
    expect(error.context).toEqual({});
  }
);
