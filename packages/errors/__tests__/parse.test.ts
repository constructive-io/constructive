import { classify, ConstructiveError, errors, format, parse, registerCatalog } from '../src';

describe('parse', () => {
  it('parses a bare ALL_CAPS DB message (legacy RAISE)', () => {
    const result = parse({ message: 'ACCOUNT_EXISTS', code: 'P0001' });
    expect(result.code).toBe('ACCOUNT_EXISTS');
    expect(result.class).toBe('public');
    expect(result.known).toBe(true);
  });

  it('recovers positional args from a dynamic DB message', () => {
    const result = parse({ message: 'LIMIT_REACHED (api_keys, 5)', code: 'P0001' });
    expect(result.code).toBe('LIMIT_REACHED');
    expect(result.context).toEqual({ resource: 'api_keys', limit: 5 });
  });

  it('prefers structured DETAIL json over the message', () => {
    const result = parse({
      message: 'ACCOUNT_EXISTS',
      code: 'CX001',
      detail: '{"code":"ACCOUNT_EXISTS","context":{"email":"a@b.com"}}'
    });
    expect(result.code).toBe('ACCOUNT_EXISTS');
    expect(result.context).toEqual({ email: 'a@b.com' });
  });

  it('reads GraphQL extensions.code', () => {
    const result = parse({ message: 'nope', extensions: { code: 'FORBIDDEN' } });
    expect(result.code).toBe('FORBIDDEN');
    expect(result.class).toBe('public');
  });

  it('unwraps a GraphQL { errors: [...] } request wrapper', () => {
    const result = parse({ errors: [{ message: 'ACCOUNT_EXISTS' }] });
    expect(result.code).toBe('ACCOUNT_EXISTS');
  });

  it('maps native SQLSTATE constraint violations', () => {
    const result = parse({ message: 'duplicate key', code: '23505', constraint: 'users_email_key' });
    expect(result.code).toBe('UNIQUE_VIOLATION');
    expect(result.context.constraint).toBe('users_email_key');
  });

  it('classifies unknown codes as internal (masked)', () => {
    const result = parse({ message: 'DATA_INVARIANT_BROKEN', code: 'P0001' });
    expect(result.code).toBe('DATA_INVARIANT_BROKEN');
    expect(result.known).toBe(false);
    expect(result.class).toBe('internal');
  });

  it('treats a bare P0001 with no semantic token as unknown', () => {
    const result = parse({ message: 'some free text', code: 'P0001' });
    expect(result.code).toBeNull();
    expect(result.class).toBe('internal');
  });

  it('round-trips a ConstructiveError', () => {
    const err = errors.ACCOUNT_EXISTS();
    const result = parse(err);
    expect(result.code).toBe('ACCOUNT_EXISTS');
    expect(result.class).toBe('public');
  });
});

describe('classify', () => {
  it('is internal for null/unknown', () => {
    expect(classify(null)).toBe('internal');
    expect(classify('NOT_A_REAL_CODE')).toBe('internal');
  });
});

describe('errors factory', () => {
  it('builds a typed ConstructiveError', () => {
    const err = errors.MODULE_NOT_FOUND({ name: 'auth' });
    expect(err).toBeInstanceOf(ConstructiveError);
    expect(err.code).toBe('MODULE_NOT_FOUND');
    expect(err.message).toBe('Module "auth" not found in modules list.');
    expect(err.http).toBe(404);
  });

  it('supports an override message', () => {
    const err = errors.MODULE_NOT_FOUND({ name: 'auth' }, 'custom');
    expect(err.message).toBe('custom');
  });

  it('exposes GraphQL extensions', () => {
    const err = errors.LIMIT_REACHED({ resource: 'api_keys', limit: 5 });
    expect(err.toExtensions()).toMatchObject({
      code: 'LIMIT_REACHED',
      class: 'public',
      context: { resource: 'api_keys', limit: 5 }
    });
  });
});

describe('format / i18n', () => {
  it('interpolates templates', () => {
    expect(format('MODULE_NOT_FOUND', { name: 'auth' })).toBe('Module "auth" not found in modules list.');
  });

  it('uses a registered locale catalog with fallback to en', () => {
    registerCatalog('es', { ACCOUNT_EXISTS: 'Ya existe una cuenta con este correo.' });
    expect(format('ACCOUNT_EXISTS', {}, 'es')).toBe('Ya existe una cuenta con este correo.');
    // falls back to en for codes not in the es catalog
    expect(format('FORBIDDEN', {}, 'es')).toBe('You do not have permission to do that.');
  });

  it('humanizes unknown codes as a last resort', () => {
    expect(format('SOME_UNKNOWN_CODE')).toBe('Some unknown code');
  });
});
