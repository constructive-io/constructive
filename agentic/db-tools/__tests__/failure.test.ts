import type { ToolFailureCode } from '@agentic-kit/harness';

import { failureFromErrors } from '../src/failure';
import type { GraphQLError } from '../src/graphql-http';
import { expectTextNamesNoTool, suggests } from './follow-up';

// What graphql/server/src/middleware/format-error.ts at main sends for one
// backend event. Where its test file has the case, the fixture is that
// expectation (named on the row); the others are its output for the same
// error. The answers arrive with HTTP 200; an errorId is random, so a fixed
// one stands in.
const ERROR_ID = '0123456789abcdef';
const answer = (message: string, extensions: Record<string, unknown>): GraphQLError => ({
  message,
  extensions: { ...extensions, httpStatus: 200 },
});
const UNEXPECTED = 'An unexpected error occurred.';
const internal = { code: 'INTERNAL_SERVER_ERROR', class: 'internal', errorId: ERROR_ID };

type Event = { event: string; sent: GraphQLError; code: ToolFailureCode };

const EVENTS: Event[] = [
  {
    // format-error.test.ts: "surfaces a permission refusal from postgres as FORBIDDEN without database identifiers"
    event: 'permission refusal (42501)',
    sent: answer('You do not have permission to do that.', { code: 'FORBIDDEN', class: 'public' }),
    code: 'permission-denied',
  },
  {
    event: 'row-level security refusal (42501)',
    sent: answer('You do not have permission to do that.', { code: 'FORBIDDEN', class: 'public' }),
    code: 'permission-denied',
  },
  {
    // format-error.test.ts: "normalizes native constraint SQLSTATE 23505 without exposing error details"
    event: 'unique violation (23505)',
    sent: answer('That value already exists.', { code: 'UNIQUE_VIOLATION', class: 'public' }),
    code: 'conflict',
  },
  {
    // format-error.test.ts: "normalizes native constraint SQLSTATE 23503 …"
    event: 'foreign key violation (23503)',
    sent: answer('A related record is required or still referenced.', { code: 'FOREIGN_KEY_VIOLATION', class: 'public' }),
    code: 'conflict',
  },
  {
    // format-error.test.ts: "normalizes native constraint SQLSTATE 23502 …"
    event: 'not-null violation (23502)',
    sent: answer('A required value is missing.', { code: 'NOT_NULL_VIOLATION', class: 'public' }),
    code: 'invalid-input',
  },
  {
    // format-error.test.ts: "normalizes native constraint SQLSTATE 23514 …"
    event: 'check violation (23514)',
    sent: answer('A value did not satisfy a constraint.', { code: 'CHECK_VIOLATION', class: 'public' }),
    code: 'invalid-input',
  },
  {
    // format-error.test.ts: "normalizes native constraint SQLSTATE 23P01 …"
    event: 'exclusion violation (23P01)',
    sent: answer('A value conflicts with an existing record.', { code: 'EXCLUSION_VIOLATION', class: 'public' }),
    code: 'conflict',
  },
  {
    // format-error.test.ts: "masks an unrecognized resolver error behind an errorId"
    event: 'no row to delete (@dataplan/pg Error)',
    sent: answer(UNEXPECTED, internal),
    code: 'failed',
  },
  {
    event: 'column already exists (42701)',
    sent: answer(UNEXPECTED, internal),
    code: 'failed',
  },
  {
    event: 'bad cast on a type change (22P02)',
    sent: answer(UNEXPECTED, internal),
    code: 'failed',
  },
  {
    // format-error.test.ts: "masks an unmapped PostgreSQL error even if the wrapper has a public code"
    event: 'unmapped error under a FORBIDDEN wrapper (42703)',
    sent: answer(UNEXPECTED, { code: 'FORBIDDEN', class: 'internal', errorId: ERROR_ID }),
    code: 'failed',
  },
  {
    event: 'signed out (UNAUTHENTICATED raise)',
    sent: answer('UNAUTHENTICATED', { code: 'UNAUTHENTICATED', class: 'public' }),
    code: 'signed-out',
  },
];

const ROWS = EVENTS.map(({ event, sent, code }) => [event, sent, code] as const);

describe('failureFromErrors', () => {
  it.each(ROWS)('%s: %s', (_event, error, code) => {
    expect(failureFromErrors([error], 'Failed to change "posts"').code).toBe(code);
  });

  it.each(ROWS.filter(([, error]) => typeof error.extensions?.errorId === 'string'))(
    '%s: carries the error id',
    (_event, error) => {
      expect(failureFromErrors([error], 'Failed').errorId).toBe(ERROR_ID);
    },
  );

  it('names the error id in the message of a masked failure', () => {
    const failure = failureFromErrors([answer(UNEXPECTED, internal)], 'Failed to delete table "posts"');
    expect(failure).toEqual({
      code: 'failed',
      message: `Failed to delete table "posts": the backend failed with an internal error. Error id: ${ERROR_ID}.`,
      hint: 'Give the error id to the backend operator: it names the logged error.',
      errorId: ERROR_ID,
    });
  });

  it('shows none of the text of an error the server logged under an id, marked internal or not', () => {
    const failure = failureFromErrors([answer('column app_sprt.entity_id does not exist', { errorId: ERROR_ID })], 'Failed to delete table "posts"');
    expect(failure.message).toBe(`Failed to delete table "posts": the backend failed with an internal error. Error id: ${ERROR_ID}.`);
  });

  it('names what is taken when the call knows', () => {
    const failure = failureFromErrors([EVENTS[2].sent], 'Failed to add field "slug" to "posts"', {
      taken: 'a field named "slug" already exists on "posts".',
    });
    expect(failure).toEqual({
      code: 'name-taken',
      message: 'Failed to add field "slug" to "posts": a field named "slug" already exists on "posts".',
      hint: 'Choose another name.',
    });
  });

  it('reads a unique violation from its code, whatever the sentence says', () => {
    const reworded = answer('Someone already has that one.', { code: 'UNIQUE_VIOLATION', class: 'public' });
    expect(failureFromErrors([reworded], 'Failed', { taken: 'the name "posts" is taken.' }).code).toBe('name-taken');
  });

  it('says what was attempted and the code the backend answered with, with no rename hint for a duplicate row', () => {
    const failure = failureFromErrors([EVENTS[2].sent], 'Failed to insert into "posts"');
    expect(failure).toEqual({
      code: 'conflict',
      message: 'Failed to insert into "posts": the backend answered with the code UNIQUE_VIOLATION.',
      hint: 'A value that must be unique is already in another row: change it, or leave that row out.',
    });
  });
});

describe('the text a server writes', () => {
  // A server that passes PostgreSQL's own text through sends these; the first two are what a live backend sent.
  const RLS = 'new row violates row-level security policy for table "field"';
  const NULL = 'null value in column "name" of relation "field" violates not-null constraint';
  const SERVER_TEXT: Array<[string, GraphQLError, ToolFailureCode, string]> = [
    ['a row-level security refusal', answer(RLS, { code: 'FORBIDDEN', class: 'public' }), 'permission-denied', 'the code FORBIDDEN'],
    ['a refused null', answer(NULL, { code: 'NOT_NULL_VIOLATION', class: 'public' }), 'invalid-input', 'the code NOT_NULL_VIOLATION'],
    ['a SQLSTATE as the code', answer(`23502: ${NULL}`, { code: '23502' }), 'failed', 'an error without a public code'],
    ['a public code with no sentence of its own', answer(RLS, { code: 'SOME_NEW_CODE', class: 'public' }), 'failed', 'the code SOME_NEW_CODE'],
  ];

  it.each(SERVER_TEXT)('%s: the failure names the public code and none of the text, the table or a SQLSTATE', (_case, error, code, words) => {
    const failure = failureFromErrors([error], 'Failed to add field "by_agent" to "tasks"');

    expect(failure.code).toBe(code);
    expect(failure.message).toBe(`Failed to add field "by_agent" to "tasks": the backend answered with ${words}.`);
    const shown = JSON.stringify(failure);
    for (const text of ['row-level security', 'null value', 'relation "field"', 'table "field"', '23502']) expect(shown).not.toContain(text);
  });
});

describe('request protection, and the status inside the error', () => {
  // Event i of server-main.md, as the SDK FetchAdapter returns it: HTTP 200, the status inside.
  const tooCostly: GraphQLError = {
    message: 'The query is too expensive. Please request fewer records or fewer nested lists.',
    extensions: { code: 'QUERY_TOO_COSTLY', class: 'public', http: 400, context: { cost: 1010100, limit: 1000000 } },
  };

  it('reads a query that is too costly as too large, and keeps its cost and limit', () => {
    expect(failureFromErrors([tooCostly], 'Failed to read the schema')).toEqual({
      code: 'query-too-large',
      message: 'Failed to read the schema: the query asks for more rows than this backend allows (cost 1010100, limit 1000000).',
      hint: 'Add `first:` to each connection in the query, and ask for fewer nested lists.',
      context: { cost: 1010100, limit: 1000000 },
    });
  });

  // The other request-protection codes of packages/errors/src/registry.ts, with their context.
  it.each([
    ['QUERY_TOO_DEEP', { depth: 12, limit: 10 }, /nests more levels than this backend allows \(depth 12, limit 10\)/],
    ['PAGE_SIZE_TOO_LARGE', { requested: 500, limit: 100 }, /more rows in one page than this backend allows \(requested 500, limit 100\)/],
    ['REQUEST_TOO_LARGE', { bytes: 2000000, limit: 1000000 }, /request body is larger than this backend allows \(bytes 2000000, limit 1000000\)/],
  ])('reads %s as too large, with its numbers', (code, context, words) => {
    const failure = failureFromErrors([answer('x', { code, class: 'public', http: 400, context })], 'Failed');
    expect(failure).toMatchObject({ code: 'query-too-large', context });
    expect(failure.message).toMatch(words);
  });

  it('reads the status the server put inside the error when no code decides', () => {
    // A public code with no case of its own, in an HTTP 200 answer.
    const denied = answer('You do not have access to that database.', {
      code: 'DATABASE_ACCESS_DENIED',
      class: 'public',
      http: 403,
    });
    expect(failureFromErrors([denied], 'Failed').code).toBe('permission-denied');
  });
});

describe('a step-up refusal', () => {
  it('asks for a fresh sign-in, not for a different account', () => {
    // packages/errors/src/registry.ts STEP_UP_REQUIRED, as the server at main sends it.
    const stepUp = answer('Additional verification is required to continue.', { code: 'STEP_UP_REQUIRED', class: 'public', http: 403 });
    expect(failureFromErrors([stepUp], 'Failed to create API key "ci"')).toEqual({
      code: 'step-up-required',
      message: 'Failed to create API key "ci": this change needs a recent sign-in.',
      hint: 'Sign in again, then retry.',
    });
  });
});

describe('a refusal on the rows of a table', () => {
  it('points to the rules of the table', () => {
    const refused = answer('You do not have permission to do that.', { code: 'FORBIDDEN', class: 'public' });
    const failure = failureFromErrors([refused], 'Failed to insert into "posts"', { rows: { table: 'posts' } });
    expect(failure).toMatchObject({
      code: 'permission-denied',
      hint: "The table's rules or grants refuse this person: read the rules of the table to see who they let in.",
      calls: [suggests('explain_access', { table_name: 'posts' })],
    });
    expectTextNamesNoTool(failure);
  });

  it('carries no rows on a control-plane refusal', () => {
    const refused = answer('You do not have permission to do that.', { code: 'FORBIDDEN', class: 'public' });
    expect(failureFromErrors([refused], 'Failed to delete table "posts"')).not.toHaveProperty('calls');
  });
});

describe('a refusal while the backend builds access rules', () => {
  const ACTION = 'Failed to set the access of table "posts"';
  const policyTypes = ['AuthzEntityMembership', 'AuthzNotReadOnly', 'AuthzEntityMembership'];
  // The backend sends the bare code as the message, and its context beside it.
  const raised = (code: string, context: Record<string, unknown>) => answer(code, { code, class: 'public', context });
  const CODES: Array<[string, Record<string, unknown>]> = [
    ['MEMBERSHIP_TYPE_MUST_BE_INT', { detail: '(got "2"; use entity_type for scope strings)' }],
    ['MEMBERSHIP_TYPE_SCOPE_NOT_FOUND', { detail: 'membership_type 99 has no registered scope (database_id d1)' }],
    ['CAPABILITY_NOT_FOUND', { names: ['publish', 'archive'] }],
    ['BAD_RLS_EXPRESSION', { detail: 'entity_field (policy.membership_by_field)' }],
    ['BAD_EXPRESSION', { detail: 'AuthzEntityMembership (node)' }],
    ['UNKNOWN_POLICY_TYPE', { policy_type: 'AuthzNope' }],
    ['SECURITY', { detail: 'obj_table_id references a table from a different database (expected d1, got d2)' }],
    ['BAD_PRIVILEGE_FOR_POLICY', { privilege: 'TRUNCATE' }],
    ['WITH_CHECK_NOT_ALLOWED', { privilege: 'SELECT' }],
  ];

  it.each(CODES)('%s: a sentence of its own with the backend detail, invalid-input, and the calls that show the parameters', (code, context) => {
    const failure = failureFromErrors([raised(code, context)], ACTION, { policyTypes });

    expect(failure.code).toBe('invalid-input');
    expect(failure.message).not.toContain(code);
    expect(failure.message).toMatch(/^Failed to set the access of table "posts": a rule|^Failed to set the access of table "posts": the backend/);
    expect(failure.message).toContain(`Backend detail: ${Object.values(context).flat().join(', ')}.`);
    expect(failure.calls).toEqual([
      suggests('describe_policy_type', { type: 'AuthzEntityMembership' }),
      suggests('describe_policy_type', { type: 'AuthzNotReadOnly' }),
    ]);
    expect(failure.context).toEqual(context);
    expectTextNamesNoTool(failure);
  });

  it('names the parameter a rule leaves out, and its policy type', () => {
    const failure = failureFromErrors([raised('MISSING_REQUIRED_FIELD', { node_type: 'AuthzValueExists', field: 'join' })], ACTION, { policyTypes });
    expect(failure).toMatchObject({
      code: 'invalid-input',
      message: `${ACTION}: a rule leaves out a parameter its policy type requires. Backend detail: join of AuthzValueExists.`,
    });
  });

  it('says what a membership_type must be', () => {
    const failure = failureFromErrors([raised(...CODES[0])], ACTION, { policyTypes });
    expect(failure.message).toBe(
      `${ACTION}: a rule's membership_type must be a whole number: 2 for organizations, 3 and up for other kinds of team; ` +
        'to name a kind by its name, use entity_type. Backend detail: (got "2"; use entity_type for scope strings).',
    );
  });

  it.each([['marked internal', { class: 'internal', errorId: ERROR_ID }]])('says an internal error (%s) while it builds the rules without the backend text, which can hold the whole rule tree', (_shape, extensions) => {
    const tree = answer('UNSUPPORTED_EXPRESSION {"or": [{"SubLink": {}}]}', extensions);

    const failure = failureFromErrors([tree], ACTION, { policyTypes: ['AuthzComposite'] });

    expect(failure).toEqual({
      code: 'failed',
      message: `${ACTION}: the backend failed with an internal error while it built the rules from their data. Error id: ${ERROR_ID}.`,
      hint:
        'Most often the data of a rule does not fit its type or the table: check it against the parameters its type takes. ' +
        'If the data is right, give the error id to the backend operator.',
      errorId: ERROR_ID,
      calls: [suggests('describe_policy_type', { type: 'AuthzComposite' })],
    });
  });
});

describe('a blueprint the backend refuses', () => {
  // The backend's blueprint check raises a public code with the place and the problem in its context's detail.
  it.each([
    ['VALIDATE_BLUEPRINT_INVALID', 'entity_types[0] "prefix" cannot be \'app\' — it is a reserved scope name'],
    ['VALIDATE_BLUEPRINT_MISSING_REQUIRED_KEY', 'entity_types[0] missing required key "prefix"'],
    ['VALIDATE_BLUEPRINT_VALUE_TOO_LONG', 'entity_types[0] "storage[0].key" exceeds 16 characters'],
  ])('%s is invalid-input, with the detail the backend sent', (code, detail) => {
    const refused = answer('Validate blueprint.', { code, class: 'public', http: 400, context: { detail } });

    const failure = failureFromErrors([refused], 'Failed to provision "crm"');

    expect(failure).toMatchObject({
      code: 'invalid-input',
      message: `Failed to provision "crm": the backend refused the blueprint: ${detail}.`,
      context: { detail },
    });
    expect(failure.message).not.toContain(code);
    expectTextNamesNoTool(failure);
  });
});

describe('a required column the change adds, on a table that has rows', () => {
  const notNull = answer('A required value is missing.', { code: 'NOT_NULL_VIOLATION', class: 'public' });
  const meaning = {
    notNull: {
      message: 'table "posts" has rows, and the change adds the required column entity_id with no value for them.',
      hint: 'Add entity_id first as an optional column, give the rows a value, then make the change again: it keeps a column that exists.',
      calls: [suggests('create_field', { table_name: 'posts', field_name: 'entity_id', type: 'uuid', is_required: false })],
    },
  };

  it('is a conflict with the table, with the fix, not a missing input', () => {
    const failure = failureFromErrors([notNull], 'Failed to set the access of table "posts"', meaning);

    expect(failure).toEqual({
      code: 'conflict',
      message: `Failed to set the access of table "posts": ${meaning.notNull.message}`,
      hint: meaning.notNull.hint,
      calls: meaning.notNull.calls,
    });
  });

  it('stays a missing value for a call that adds no required column', () => {
    expect(failureFromErrors([notNull], 'Failed to insert into "posts"').code).toBe('invalid-input');
  });
});

describe('a write refused in a read-only transaction', () => {
  // What the server sends for SQLSTATE 25006: a public code, http 403, and its own sentence.
  const READ_ONLY = {
    message: 'This request is read-only, so it cannot change anything. A read-only credential causes this.',
    extensions: { code: 'READ_ONLY_TRANSACTION', class: 'public', http: 403 },
  };

  it('is read-only, not a refusal by the rules of a table, with no call that writes', () => {
    const failure = failureFromErrors([READ_ONLY], 'Failed to insert into "posts"', { rows: { table: 'posts' } });

    expect(failure).toEqual({
      code: 'read-only',
      message: 'Failed to insert into "posts": the request was read-only, so nothing changed; a read-only credential is the usual cause.',
      hint: 'Use a credential that may write (for an agent, ask the person to grant one). If this credential may write, the backend answered from a read-only copy: tell the backend operator.',
      retryable: false,
    });
  });
});

describe('a field type the backend does not have', () => {
  it('says so, with the type the caller probably meant', () => {
    const failure = failureFromErrors(
      [answer('NONEXISTENT_TYPE', { code: 'NONEXISTENT_TYPE', class: 'public', context: { type: { name: 'strng' } } })],
      'Failed to add field "memoh" to "rv3_backs"',
    );

    expect(failure).toMatchObject({
      code: 'invalid-input',
      message: expect.stringContaining('Failed to add field "memoh" to "rv3_backs": the backend has no type "strng"'),
      hint: 'Did you mean "text"?',
    });
  });
});

describe('a backend that limits requests', () => {
  it.each([
    ['RATE_LIMITED with the seconds to wait', answer('Too many requests.', { code: 'RATE_LIMITED', class: 'public', http: 429, retryAfterSeconds: 30 }), 'Wait 30 seconds, then call again.'],
    ['CONCURRENCY_LIMIT_REACHED', answer('Too many requests are in flight.', { code: 'CONCURRENCY_LIMIT_REACHED', class: 'public', http: 429 }), 'Wait a moment, then call again.'],
    ['a 429 with no code', { message: 'HTTP 429', extensions: { code: 'HTTP_ERROR', httpStatus: 429 } }, 'Wait a moment, then call again.'],
  ])('%s: is rate-limited, not unreachable, and says to wait', (_case, error, hint) => {
    const failure = failureFromErrors([error as GraphQLError], 'Failed to read tables');

    expect(failure).toMatchObject({ code: 'rate-limited', retryable: true, hint, message: expect.stringContaining('the backend is limiting how many requests it takes') });
  });
});
