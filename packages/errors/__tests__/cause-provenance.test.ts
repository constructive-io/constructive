import {
  ConstructiveError,
  errors,
  getDefinition,
  makeError,
  makeErrorFromDefinition,
  parse,
  toError,
} from '../src';

function hasOwnCause(error: Error): boolean {
  return Object.prototype.hasOwnProperty.call(error, 'cause');
}

function expectNativeCause(error: Error, expected: unknown): void {
  expect(hasOwnCause(error)).toBe(true);
  expect(error.cause).toBe(expected);
  expect(Object.getOwnPropertyDescriptor(error, 'cause')).toMatchObject({
    value: expected,
    writable: true,
    enumerable: false,
    configurable: true,
  });
}

describe('native cause provenance', () => {
  it('preserves object identity and nested native causes', () => {
    const nestedCause = { requestId: 'req-1' };
    const original = new Error('upstream failure', { cause: nestedCause });
    const normalized = toError(original);
    const canonicalCause = { operation: 'lookup' };
    const canonical = new ConstructiveError({
      code: 'ACCOUNT_EXISTS',
      message: 'account exists',
      errorClass: 'public',
      http: 409,
      cause: canonicalCause,
    });

    expectNativeCause(normalized, original);
    expect((normalized.cause as Error).cause).toBe(nestedCause);
    expectNativeCause(canonical, canonicalCause);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'a primitive failure'],
    ['number', 17],
    ['boolean', false],
  ])('preserves a %s thrown value', (_label, thrownValue) => {
    expect(toError(thrownValue).cause).toBe(thrownValue);
  });

  it('preserves identity for an arbitrary thrown object', () => {
    const thrownObject = { source: 'adapter', nested: { retryable: true } };

    expect(toError(thrownObject).cause).toBe(thrownObject);
  });

  it('distinguishes an absent cause from an explicitly supplied undefined cause', () => {
    const withoutCause = new ConstructiveError({
      code: 'ACCOUNT_EXISTS',
      message: 'account exists',
      errorClass: 'public',
      http: 409,
    });
    const withUndefinedCause = new ConstructiveError({
      code: 'ACCOUNT_EXISTS',
      message: 'account exists',
      errorClass: 'public',
      http: 409,
      cause: undefined,
    });

    expect(hasOwnCause(withoutCause)).toBe(false);
    expect(Object.keys(withoutCause)).not.toContain('cause');
    expectNativeCause(withUndefinedCause, undefined);
  });

  it('excludes cause from GraphQL extensions and JSON serialization', () => {
    const rawCause = { secret: 'do-not-serialize', nested: { token: 'hidden' } };
    const error = new ConstructiveError({
      code: 'ACCOUNT_EXISTS',
      message: 'account exists',
      errorClass: 'public',
      http: 409,
      cause: rawCause,
    });
    const extensions = error.toExtensions();

    expect(extensions).toEqual({ code: 'ACCOUNT_EXISTS', class: 'public', http: 409 });
    expect(extensions).not.toHaveProperty('cause');
    expect(JSON.stringify(error)).not.toContain('do-not-serialize');
    expect(JSON.stringify(extensions)).not.toContain('do-not-serialize');
  });

  it('returns a canonical error unchanged', () => {
    const cause = new Error('original failure');
    const canonical = errors.ACCOUNT_EXISTS({}, 'canonical override', { cause });

    expect(toError(canonical)).toBe(canonical);
    expect(canonical.cause).toBe(cause);
    expect((canonical.cause as Error).cause).toBeUndefined();
  });
});

describe('factory cause options', () => {
  it('supports typed, empty, generated, definition, and inline factories', () => {
    const cause = { source: 'factory test' };
    const typed = errors.MODULE_NOT_FOUND({ name: 'auth' }, 'typed override', { cause });
    const empty = errors.ACCOUNT_EXISTS({}, 'empty override', { cause });
    const generated = errors.API_KEY_LIMIT_REACHED(
      { resource: 'api_keys', limit: 5 },
      'generated override',
      { cause },
    );
    const definition = makeErrorFromDefinition(getDefinition('STORAGE_PROCESSING_CONFLICT')!)(
      { database_id: 'db-1', file_id: 'file-1' },
      'definition override',
      { cause },
    );
    const inline = makeError<{ value: string }>(
      'STORAGE_PROCESSING_CONFLICT',
      ({ value }) => `inline ${value}`,
      409,
      'public',
    )({ value: 'context' }, 'inline override', { cause });

    expect(typed).toMatchObject({
      code: 'MODULE_NOT_FOUND',
      message: 'typed override',
      context: { name: 'auth' },
    });
    expect(empty).toMatchObject({
      code: 'ACCOUNT_EXISTS',
      message: 'empty override',
      context: {},
    });
    expect(generated).toMatchObject({
      code: 'API_KEY_LIMIT_REACHED',
      message: 'generated override',
      context: { resource: 'api_keys', limit: 5 },
    });
    expect(definition).toMatchObject({
      code: 'STORAGE_PROCESSING_CONFLICT',
      message: 'definition override',
      context: { database_id: 'db-1', file_id: 'file-1' },
    });
    expect(inline).toMatchObject({
      code: 'STORAGE_PROCESSING_CONFLICT',
      message: 'inline override',
      context: { value: 'context' },
    });

    for (const error of [typed, empty, generated, definition, inline]) {
      expectNativeCause(error, cause);
    }
  });

  it('omits the native cause property when options are omitted', () => {
    const definition = makeErrorFromDefinition(getDefinition('STORAGE_PROCESSING_CONFLICT')!);
    const inline = makeError<{ value: string }>(
      'STORAGE_PROCESSING_CONFLICT',
      ({ value }) => value,
    );
    const factoryErrors = [
      errors.MODULE_NOT_FOUND({ name: 'auth' }),
      errors.ACCOUNT_EXISTS(),
      errors.API_KEY_LIMIT_REACHED({}),
      definition({}),
      inline({ value: 'context' }),
    ];

    for (const error of factoryErrors) {
      expect(hasOwnCause(error)).toBe(false);
    }
  });
  it('distinguishes empty factory options from an explicit undefined cause', () => {
    const inline = makeError<{ value: string }>('STORAGE_PROCESSING_CONFLICT', ({ value }) => value);
    expect(hasOwnCause(errors.ACCOUNT_EXISTS({}, undefined, {}))).toBe(false);
    expectNativeCause(errors.ACCOUNT_EXISTS({}, undefined, { cause: undefined }), undefined);
    expect(hasOwnCause(inline({ value: 'context' }, undefined, {}))).toBe(false);
    expectNativeCause(inline({ value: 'context' }, undefined, { cause: undefined }), undefined);
  });
});

describe('producer class provenance', () => {
  const unknownCode = 'ERROR_PROVENANCE_TEST_UNREGISTERED';

  it('records valid DETAIL classes for unknown public and registered public codes overridden as internal', () => {
    const unknownPublic = parse({
      message: 'detail message',
      code: 'P0001',
      detail: JSON.stringify({
        code: unknownCode,
        context: { source: 'detail' },
        class: 'public',
      }),
    });
    const registeredInternal = parse({
      message: 'detail message',
      code: 'P0001',
      detail: JSON.stringify({
        code: 'ACCOUNT_EXISTS',
        context: { source: 'detail' },
        class: 'internal',
      }),
    });

    expect(unknownPublic).toMatchObject({
      code: unknownCode,
      context: { source: 'detail' },
      class: 'public',
      explicitClass: 'public',
      known: false,
    });
    expect(registeredInternal).toMatchObject({
      code: 'ACCOUNT_EXISTS',
      context: { source: 'detail' },
      class: 'internal',
      explicitClass: 'internal',
      known: true,
    });
  });

  it('falls back to registry or internal classification for invalid and missing DETAIL classes', () => {
    const cases = [
      {
        code: 'STORAGE_PROCESSING_CONFLICT',
        detail: { code: 'STORAGE_PROCESSING_CONFLICT', context: {}, class: 'invalid' },
        expectedClass: 'public',
        known: true,
      },
      {
        code: 'STORAGE_PROCESSING_CONFLICT',
        detail: { code: 'STORAGE_PROCESSING_CONFLICT', context: {} },
        expectedClass: 'public',
        known: true,
      },
      {
        code: unknownCode,
        detail: { code: unknownCode, context: {}, class: 'invalid' },
        expectedClass: 'internal',
        known: false,
      },
      {
        code: unknownCode,
        detail: { code: unknownCode, context: {} },
        expectedClass: 'internal',
        known: false,
      },
    ];

    for (const testCase of cases) {
      const result = parse({
        message: testCase.code,
        code: 'P0001',
        detail: JSON.stringify(testCase.detail),
      });

      expect(result.code).toBe(testCase.code);
      expect(result.class).toBe(testCase.expectedClass);
      expect(result.known).toBe(testCase.known);
      expect(result.explicitClass).toBeUndefined();
    }
  });

  it('records direct and wrapped GraphQL producer classes', () => {
    const direct = parse({
      message: 'graphql message',
      extensions: {
        code: 'ACCOUNT_EXISTS',
        context: { source: 'graphql' },
        class: 'internal',
      },
    });
    const wrapped = parse({
      errors: [
        {
          message: 'wrapped graphql message',
          extensions: {
            code: unknownCode,
            context: { source: 'wrapped' },
            class: 'public',
          },
        },
      ],
    });

    expect(direct).toMatchObject({
      code: 'ACCOUNT_EXISTS',
      context: { source: 'graphql' },
      class: 'internal',
      explicitClass: 'internal',
      known: true,
    });
    expect(wrapped).toMatchObject({
      code: unknownCode,
      context: { source: 'wrapped' },
      class: 'public',
      explicitClass: 'public',
      known: false,
    });
  });

  it('omits producer metadata when GraphQL class is missing or invalid', () => {
    for (const classification of [undefined, 'invalid']) {
      const result = parse({
        extensions: { code: 'STORAGE_PROCESSING_CONFLICT', class: classification },
      });
      expect(result.class).toBe('public');
      expect(result).not.toHaveProperty('explicitClass');
    }
  });

  it('keeps DETAIL precedence and does not borrow a GraphQL class when DETAIL omits one', () => {
    const detailWins = parse({
      message: 'detail wins',
      code: 'P0001',
      detail: JSON.stringify({
        code: unknownCode,
        context: { selected: 'detail' },
        class: 'public',
      }),
      extensions: {
        code: 'ACCOUNT_EXISTS',
        context: { selected: 'graphql' },
        class: 'internal',
      },
    });
    const registryFallback = parse({
      message: 'detail class is absent',
      code: 'P0001',
      detail: JSON.stringify({
        code: 'STORAGE_PROCESSING_CONFLICT',
        context: { selected: 'detail' },
      }),
      extensions: {
        code: 'ACCOUNT_EXISTS',
        context: { selected: 'graphql' },
        class: 'internal',
      },
    });

    expect(detailWins).toMatchObject({
      code: unknownCode,
      context: { selected: 'detail' },
      class: 'public',
      explicitClass: 'public',
      known: false,
    });
    expect(registryFallback).toMatchObject({
      code: 'STORAGE_PROCESSING_CONFLICT',
      context: { selected: 'detail' },
      class: 'public',
      known: true,
    });
    expect(registryFallback.explicitClass).toBeUndefined();
  });

  it('treats a canonical instance as the immediate classified producer', () => {
    const canonical = new ConstructiveError({
      code: 'ACCOUNT_EXISTS',
      message: 'canonical message',
      errorClass: 'internal',
      http: 500,
      context: { source: 'canonical' },
    });

    const result = parse(canonical);

    expect(result).toMatchObject({
      code: 'ACCOUNT_EXISTS',
      context: { source: 'canonical' },
      class: 'internal',
      explicitClass: 'internal',
      known: true,
      rawMessage: 'canonical message',
      originalError: canonical,
    });
  });

  it('marks toError output with its own immediate class metadata', () => {
    const raw = {
      message: 'raw producer message',
      code: 'P0001',
      detail: JSON.stringify({ code: 'STORAGE_PROCESSING_CONFLICT', context: { source: 'raw' } }),
    };
    const rawParsed = parse(raw);
    const normalized = toError(raw);
    const normalizedParsed = parse(normalized);

    expect(rawParsed.class).toBe('public');
    expect(rawParsed.explicitClass).toBeUndefined();
    expect(normalized.cause).toBe(raw);
    expect(normalizedParsed).toMatchObject({
      code: 'STORAGE_PROCESSING_CONFLICT',
      context: { source: 'raw' },
      class: 'public',
      explicitClass: 'public',
      known: true,
      originalError: normalized,
    });
  });
});
