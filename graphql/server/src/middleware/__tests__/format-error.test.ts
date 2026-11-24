import { parseFunctionSource } from 'graphile-function-source';
import {
  execute,
  GraphQLEnumType,
  GraphQLError,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
  validate,
} from 'graphql';

import { formatError } from '../format-error';

const ResetPasswordInput = new GraphQLInputObjectType({
  name: 'ResetPasswordInput',
  fields: {
    roleId: { type: new GraphQLNonNull(GraphQLString) },
    newPassword: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      ok: { type: GraphQLString, resolve: () => 'ok' },
      mode: {
        type: GraphQLString,
        args: { m: { type: new GraphQLNonNull(new GraphQLEnumType({ name: 'Mode', values: { LIVE: {}, TEST: {} } })) } },
        resolve: () => 'ok',
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      resetPassword: {
        type: GraphQLString,
        args: { input: { type: new GraphQLNonNull(ResetPasswordInput) } },
        resolve: () => 'true',
      },
      brokenField: {
        type: GraphQLString,
        resolve: () => {
          throw new Error('relation "internal_secrets" does not exist');
        },
      },
    },
  }),
});

/** The errors a request produces, as the client would receive them. */
const run = async (query: string, variables?: Record<string, unknown>, operationName?: string) => {
  const document = parse(query);
  const invalid = validate(schema, document);
  const raised: readonly GraphQLError[] = invalid.length
    ? invalid
    : ((await execute({ schema, document, variableValues: variables, operationName })).errors ?? []);

  expect(raised.length).toBeGreaterThan(0);
  return raised.map(
    (error) => formatError(error) as { message: string; extensions?: Record<string, unknown> }
  );
};

describe('formatError', () => {
  it('surfaces an input field the schema does not define', async () => {
    const [result] = await run('mutation($i: ResetPasswordInput!){ resetPassword(input: $i) }', {
      i: { userId: 'role-1', roleId: 'role-1', newPassword: 'secret' },
    });

    expect(result.message).toContain('Field "userId" is not defined by type "ResetPasswordInput"');
    expect(result.extensions?.code).toBe('BAD_USER_INPUT');
    expect(result.extensions?.errorId).toBeUndefined();
    expect(result.message).not.toContain('secret');
  });

  it('names the variable and path of a value of the wrong type, not the value', async () => {
    const [result] = await run('mutation($i: ResetPasswordInput!){ resetPassword(input: $i) }', {
      i: { roleId: 'role-1', newPassword: { key: 'sk_test_secret' } },
    });

    expect(result.message).toBe(
      'Variable "$i" got invalid value at "i.newPassword"; String cannot represent a non string value.'
    );
    expect(result.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('names an enum value the type does not have without echoing it', async () => {
    const [result] = await run('query($m: Mode!){ mode(m: $m) }', { m: 'sk_test_secret' });

    expect(result.message).toBe('Variable "$m" got invalid value; Value does not exist in "Mode" enum.');
    expect(result.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('surfaces a required input field the request left out', async () => {
    const [result] = await run('mutation($i: ResetPasswordInput!){ resetPassword(input: $i) }', {
      i: { roleId: 'role-1' },
    });

    expect(result.message).toContain('Field "newPassword" of required type "String!" was not provided');
    expect(result.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('surfaces a selection the schema cannot answer', async () => {
    const [result] = await run(
      'mutation{ resetPassword(input: {roleId: "r", newPassword: "p"}){ id } }'
    );

    expect(result.message).toContain('must not have a selection');
    expect(result.extensions?.code).toBe('BAD_USER_INPUT');
    expect(result).toMatchObject({ locations: [{ line: 1, column: 64 }] });
  });

  it.each([
    [undefined, 'Must provide operation name if query contains multiple operations.'],
    ['Unknown', 'Unknown operation named "Unknown".']
  ])('keeps the operation selection refusal with operationName %s', async (operationName, message) => {
    const [result] = await run('query A { ok } query B { ok }', undefined, operationName);

    expect(result).toEqual({ message, extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('keeps a code the GraphQL layer supplied for itself', () => {
    const error = new GraphQLError('PersistedQueryNotFound', {
      extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
    });

    const result = formatError(error) as { message: string; extensions?: Record<string, unknown> };

    expect(result.message).toBe('PersistedQueryNotFound');
    expect(result.extensions?.code).toBe('PERSISTED_QUERY_NOT_FOUND');
  });

  it('masks an unrecognized resolver error behind an errorId', async () => {
    const [result] = await run('mutation{ brokenField }');

    expect(result.message).toBe('An unexpected error occurred.');
    expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    expect(result.extensions?.errorId).toMatch(/^[0-9a-f]{16}$/);
  });

  it.each([
    ['CREATE FUNCTION f() RETURNS int LANGUAGE sql AS $$ SELEC 1 $$', 'FUNCTION_SOURCE_PARSE_ERROR', 'SELEC', 'syntax error at or near "SELEC"'],
    ['CREATE FUNCTION app.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$', 'FUNCTION_SOURCE_UNSUPPORTED', undefined, 'the function name must be unqualified; schemaId chooses its schema']
  ])('preserves the public function-source refusal %s', async (source, code, token, message) => {
    const parseError = await parseFunctionSource(source).catch((error: GraphQLError) => error);
    expect(parseError).toBeInstanceOf(GraphQLError);
    const originalError = parseError as GraphQLError;
    const result = formatError(new GraphQLError(originalError.message, {
      path: ['createFunctionFromSource'],
      originalError
    }));

    expect(result).toEqual({
      message,
      path: ['createFunctionFromSource'],
      extensions: { code, class: 'public', ...(token ? { position: source.indexOf(token) } : {}) }
    });
  });

  it('masks errors without request locations even when Grafserv omits the original error', () => {
    const error = new GraphQLError('relation "internal_secrets" does not exist');

    expect(formatError(error)).toEqual({
      message: 'An unexpected error occurred.',
      extensions: { code: 'INTERNAL_SERVER_ERROR', class: 'internal', errorId: expect.stringMatching(/^[0-9a-f]{16}$/) },
    });
  });

  it('surfaces a permission refusal from postgres as FORBIDDEN without database identifiers', () => {
    const pgError = Object.assign(new Error('permission denied for table agent_thread'), {
      code: '42501',
      table: 'agent_thread',
      schema: 'app_private',
    });
    const error = new GraphQLError(pgError.message, {
      path: ['agentThreads'],
      originalError: pgError,
      extensions: { context: { schema: pgError.schema } },
    });

    const result = formatError(error) as { message: string; extensions?: Record<string, unknown> };

    expect(result.message).toBe('You do not have permission to do that.');
    expect(result.extensions?.code).toBe('FORBIDDEN');
    expect(result.extensions?.class).toBe('public');
    expect(result.extensions?.errorId).toBeUndefined();
    expect(result.extensions?.context).toBeUndefined();
  });

  it.each([
    ['23505', 'UNIQUE_VIOLATION', 'That value already exists.'],
    ['23503', 'FOREIGN_KEY_VIOLATION', 'A related record is required or still referenced.'],
    ['23502', 'NOT_NULL_VIOLATION', 'A required value is missing.'],
    ['23514', 'CHECK_VIOLATION', 'A value did not satisfy a constraint.'],
    ['23P01', 'EXCLUSION_VIOLATION', 'A value conflicts with an existing record.'],
  ])('normalizes native constraint SQLSTATE %s without exposing error details', (sqlState, code, message) => {
    const pgError = Object.assign(new Error('constraint private_constraint on app_private.internal_table failed'), {
      code: sqlState,
      schema: 'app_private',
      table: 'internal_table',
      column: 'internal_column',
      constraint: 'private_constraint',
      detail: 'private value',
    });
    const error = new GraphQLError(pgError.message, {
      originalError: pgError,
      path: ['updateRecord'],
    });

    expect(formatError(error)).toEqual({
      message,
      path: ['updateRecord'],
      extensions: { code, class: 'public' },
    });
  });

  it('masks an unmapped PostgreSQL error even if the wrapper has a public code', () => {
    const pgError = Object.assign(new Error('column "internal_column" does not exist'), { code: '42703' });
    const error = new GraphQLError(pgError.message, {
      originalError: pgError,
      path: ['record'],
      extensions: { code: 'FORBIDDEN', context: { column: 'internal_column' } },
    });
    expect(formatError(error)).toEqual({
      message: 'An unexpected error occurred.',
      path: ['record'],
      extensions: { code: 'FORBIDDEN', class: 'internal', errorId: expect.stringMatching(/^[0-9a-f]{16}$/) },
    });
  });

  /** What node-postgres hands over for `errors.raise_error(code, context, class)`. */
  const raisedByDatabase = (code: string, context: Record<string, unknown>, errorClass?: string) => {
    const pgError = Object.assign(new Error(code), {
      code: 'P0001',
      detail: JSON.stringify({ code, context, ...(errorClass ? { class: errorClass } : {}) }),
    });
    return new GraphQLError(pgError.message, { path: ['confirmUpload'], originalError: pgError });
  };

  it('passes a public database code the registry does not know through unchanged', () => {
    const result = formatError(raisedByDatabase('CODE_NO_REGISTRY_KNOWS', { id: 'abc' }, 'public')) as {
      message: string;
      extensions?: Record<string, unknown>;
    };

    expect(result.message).toBe('CODE_NO_REGISTRY_KNOWS');
    expect(result.extensions).toEqual({
      code: 'CODE_NO_REGISTRY_KNOWS',
      class: 'public',
      context: { id: 'abc' },
    });
  });

  it('passes an internal database code the registry does not know through with an errorId', () => {
    const result = formatError(raisedByDatabase('CODE_NO_REGISTRY_KNOWS', { id: 'abc' }, 'internal')) as {
      message: string;
      extensions?: Record<string, unknown>;
    };

    expect(result.message).toBe('CODE_NO_REGISTRY_KNOWS');
    expect(result.extensions).toMatchObject({
      code: 'CODE_NO_REGISTRY_KNOWS',
      class: 'internal',
      context: { id: 'abc' },
    });
    expect(result.extensions?.errorId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('treats an unknown database code that names no class as internal', () => {
    const result = formatError(raisedByDatabase('CODE_NO_REGISTRY_KNOWS', {})) as {
      message: string;
      extensions?: Record<string, unknown>;
    };

    expect(result.message).toBe('CODE_NO_REGISTRY_KNOWS');
    expect(result.extensions?.code).toBe('CODE_NO_REGISTRY_KNOWS');
    expect(result.extensions?.class).toBe('internal');
    expect(result.extensions?.errorId).toMatch(/^[0-9a-f]{16}$/);
  });

  it.each(['production', 'development', 'test', undefined])(
    'formats errors identically when NODE_ENV is %s',
    async (env) => {
      const previous = process.env.NODE_ENV;
      if (env === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = env;
      try {
        const [result] = await run('mutation{ brokenField }');
        expect(result.message).toBe('An unexpected error occurred.');
        expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
      }
    }
  );
});
