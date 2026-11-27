import { failureText, type HarnessToolResult, listed, nearestName, type ToolCallSuggestion, type ToolFailure } from '@agentic-kit/harness';

import { BlueprintBuildError, BuildNotQueuedError } from './blueprint-construction';
import { answerText, type GraphQLError, isSignedOutCode, retryAfterOf, statusOf, thrownText } from './graphql-http';

export { failureText };

/** A value, or the failure that says why there is none. */
export type Result<T> = { kind: 'ok'; value: T } | { kind: 'failed'; failure: ToolFailure };

/** A failure a helper raises for the tool that called it to report as is. */
export class ToolFailureError extends Error {
  readonly failure: ToolFailure;

  constructor(failure: ToolFailure) {
    super(failure.message);
    this.name = 'ToolFailureError';
    this.failure = failure;
  }
}

/** A failed call, with the tool's own `details`. */
export function failedResult<TDetails>(failure: ToolFailure, details: TDetails): HarnessToolResult<TDetails> {
  return { content: [{ type: 'text', text: failureText(failure) }], details, failure };
}

export function noBackendFailure(hint?: string): ToolFailure {
  return {
    code: 'no-backend',
    message: 'No Constructive backend is configured.',
    hint: hint ?? 'Choose a backend in the app, then retry.',
  };
}

/** A call to suggest; `choose` names the inputs the caller must still choose, which `why` explains. */
export const suggest = (tool: string, input: Record<string, unknown>, why: string, choose?: string[]): ToolCallSuggestion => ({
  tool,
  input,
  why,
  ...(choose?.length ? { choose } : {}),
});

export const DESCRIBE_SCHEMA = suggest('describe_schema', {}, 'See the tables and fields that exist');

/** No database is bound yet: the call that makes one, with its name left to choose. */
export const NEW_DATABASE = suggest('provision_database', {}, 'Create a database for this directory and bind it', ['database_name']);

/**
 * An update or delete the backend answered without an error but with no row in
 * its payload: on the latest server that is how row-level security answers for
 * a row this account cannot see, and how any server answers for a row that is
 * gone. `check` is the call that lists what exists.
 */
export function noRowsChanged(action: string, check: ToolCallSuggestion): ToolFailure {
  return {
    code: 'no-rows-changed',
    message: `${action}: no row was changed, because it does not exist or this account may not change it.`,
    hint: 'Check that it still exists; if it does, this account may not change it.',
    calls: [check],
  };
}

/** What a row the backend answered without is, in a row's own record (add_records' failedRows). */
export const NO_NEW_ROW = 'The backend answered without the new row, so it may not exist, or this account may not read it.';

/**
 * A create the backend answered without an error but without the new row:
 * the row may not exist, or a policy lets this account create it but not
 * read it back. `check` is the call that shows whether it exists, when a tool
 * has one.
 */
export function noRowCreated(action: string, check?: ToolCallSuggestion): ToolFailure {
  return {
    code: 'no-rows-changed',
    message: `${action}: ${NO_NEW_ROW.charAt(0).toLowerCase()}${NO_NEW_ROW.slice(1)}`,
    ...(check ? { hint: 'Check whether it exists before you call again.', calls: [check] } : {}),
  };
}

/**
 * A project binding with values that are not of their form (`keys`, in `where`): none of them is used, sent or shown,
 * so the project acts as bound to no database until the person fixes them.
 */
export function invalidBinding(keys: readonly string[], where = '.env'): ToolFailure {
  return {
    code: 'missing-credentials',
    message:
      `The project's database entry is not valid: ${listed(keys.map((key) => `${key} in ${where}`))} ${keys.length === 1 ? 'does' : 'do'} not hold a value ` +
      'of the form it takes, so the value is not used or shown.',
    hint: 'Fix or remove those lines, then bind the directory to a database again.',
  };
}

// provision_database fills a missing OWNER_ID when it keeps a live binding.
export const MISSING_OWNER: ToolFailure = {
  code: 'missing-credentials',
  message: 'The project binding has no owner: OWNER_ID is missing from .env and the backend reported none.',
  hint: "Bind the directory again under the project's database name to refresh the binding, then retry.",
  calls: [suggest('provision_database', {}, "Refresh the binding: give the project's database name", ['database_name'])],
};

/**
 * What the call means, when it knows. `taken` names a unique value that is
 * already taken ('a field named "slug" already exists on "posts"'), and
 * `check` the read that shows what exists; without `taken`, a duplicate is a
 * `conflict` with other rows. `rows` names the app table a call on rows acts
 * on, so a refusal suggests the read of its rules; a refusal on the control
 * plane is about the account's rights on the database, which those rules do
 * not decide. `notNull` is what a refused NOT NULL means for a call that adds
 * required columns to a table that may have rows. `policyTypes` are the policy
 * types a call that builds access rules sends, for the calls that show their
 * parameters when a rule is refused.
 */
export type FailureMeaning = {
  taken?: string;
  check?: ToolCallSuggestion;
  rows?: { table: string };
  notNull?: { message: string; hint: string; calls: ToolCallSuggestion[] };
  policyTypes?: readonly string[];
};

/** The read of a table's rules, for a refusal on its rows. */
export const explainAccessCall = (table: string): ToolCallSuggestion => suggest('explain_access', { table_name: table }, 'See the rules of the table');

/** The next step of a refusal on the rows of an app table, in words. */
export const ROWS_REFUSED_HINT = "The table's rules or grants refuse this person: read the rules of the table to see who they let in.";

type Why = Omit<ToolFailure, 'message'> & { message?: string };

const FOREIGN_KEY: Why = { code: 'conflict', hint: 'A row it refers to is missing, or other rows still refer to it.' };

// A change in a read-only request: no rule of the table decides it, so no call that writes helps.
const READ_ONLY: Why = {
  code: 'read-only',
  message: 'the request was read-only, so nothing changed; a read-only credential is the usual cause.',
  hint: 'Use a credential that may write (for an agent, ask the person to grant one). If this credential may write, the backend answered from a read-only copy: tell the backend operator.',
  retryable: false,
};

const UNIQUE_CONFLICT_HINT = 'A value that must be unique is already in another row: change it, or leave that row out.';

function duplicate(meaning: FailureMeaning): Why {
  if (!meaning.taken) return { code: 'conflict', hint: UNIQUE_CONFLICT_HINT };
  const { check } = meaning;
  return {
    code: 'name-taken',
    message: meaning.taken,
    hint: check ? 'Choose another name; check the names that exist.' : 'Choose another name.',
    ...(check ? { calls: [check] } : {}),
  };
}

type Context = Record<string, unknown> | undefined;

// The sentence of each code the backend sends when it cannot build a policy from a rule's data; the message it sends
// beside the code is the bare code.
const POLICY_CODES: Record<string, string> = {
  MEMBERSHIP_TYPE_MUST_BE_INT:
    "a rule's membership_type must be a whole number: 2 for organizations, 3 and up for other kinds of team; to name a kind by its name, use entity_type.",
  MEMBERSHIP_TYPE_SCOPE_NOT_FOUND: "a rule's membership_type names a kind of membership this database does not have.",
  CAPABILITY_NOT_FOUND: 'a rule names a capability this database does not have.',
  BAD_RLS_EXPRESSION: 'the backend could not build a rule from its data: a parameter is missing, is not one its type takes, or has a wrong value.',
  BAD_EXPRESSION: "a rule's data is not in the shape its type takes.",
  MISSING_REQUIRED_FIELD: 'a rule leaves out a parameter its policy type requires.',
  UNKNOWN_POLICY_TYPE: 'a rule names a policy type the backend does not have.',
  SECURITY: 'a rule names a table of another database.',
  BAD_PRIVILEGE_FOR_POLICY: 'a rule names a privilege a policy cannot take: use select, insert, update or delete.',
  WITH_CHECK_NOT_ALLOWED: 'a rule checks new rows for a privilege that makes none (select or delete).',
};

// The one value the backend sends beside a policy code, labelled for the message.
function backendDetail(context: Context): string {
  const field = typeof context?.field === 'string' ? `${context.field}${typeof context.node_type === 'string' ? ` of ${context.node_type}` : ''}` : undefined;
  const value = context?.detail ?? context?.names ?? context?.policy_type ?? context?.privilege ?? field;
  const text = Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';
  return text ? ` Backend detail: ${text}.` : '';
}

// One call that describes each policy type the call sends, or one that lists them all.
const describePolicyCalls = (types: readonly string[] | undefined): ToolCallSuggestion[] =>
  types?.length
    ? [...new Set(types)].map((type) => suggest('describe_policy_type', { type }, `See the parameters ${type} takes`))
    : [suggest('describe_policy_type', {}, 'See the policy types and what each one needs')];

function policyRefusal(code: string, meaning: FailureMeaning, context: Context): Why | undefined {
  const sentence = POLICY_CODES[code];
  if (!sentence) return undefined;
  return { code: 'invalid-input', message: `${sentence}${backendDetail(context)}`, hint: 'Check the rule against the parameters its type takes.', calls: describePolicyCalls(meaning.policyTypes) };
}

// The public codes the backend's blueprint check raises, each with the place and the problem in its detail.
const BLUEPRINT_CODES = new Set([
  'VALIDATE_BLUEPRINT_DEPENDENCY_NOT_MET',
  'VALIDATE_BLUEPRINT_EMPTY_NOT_ALLOWED',
  'VALIDATE_BLUEPRINT_EXPECTED_ARRAY',
  'VALIDATE_BLUEPRINT_EXPECTED_BOOLEAN',
  'VALIDATE_BLUEPRINT_EXPECTED_NUMBER',
  'VALIDATE_BLUEPRINT_EXPECTED_OBJECT',
  'VALIDATE_BLUEPRINT_EXPECTED_STRING',
  'VALIDATE_BLUEPRINT_EXPECTED_STRING_OR_OBJECT',
  'VALIDATE_BLUEPRINT_INVALID',
  'VALIDATE_BLUEPRINT_INVALID_ENUM',
  'VALIDATE_BLUEPRINT_INVALID_FORMAT',
  'VALIDATE_BLUEPRINT_MISSING_REQUIRED_KEY',
  'VALIDATE_BLUEPRINT_RESERVED_VALUE',
  'VALIDATE_BLUEPRINT_VALUE_TOO_LONG',
]);

function blueprintRefusal(context: Context): Why {
  const detail = typeof context?.detail === 'string' ? context.detail : undefined;
  return {
    code: 'invalid-input',
    message: `the backend refused the blueprint${detail ? `: ${detail.replace(/\.?$/, '.')}` : '.'}`,
    hint: 'Fix the part of the blueprint the message names, then send it again; nothing was created.',
  };
}

// An internal error while the backend builds the rules: its text is not for the person, and can hold the whole rule tree.
function policyInternal(meaning: FailureMeaning, errorId: string | undefined): Why {
  return {
    code: 'failed',
    message: `the backend failed with an internal error while it built the rules from their data.${errorId ? ` Error id: ${errorId}.` : ''}`,
    hint: 'Most often the data of a rule does not fit its type or the table: check it against the parameters its type takes. If the data is right, give the error id to the backend operator.',
    calls: describePolicyCalls(meaning.policyTypes),
  };
}

// The numbers of a request-protection error, as its context names them: " (cost 1010100, limit 1000000)".
function measured(context: Context, keys: string[]): string {
  const parts = keys.filter((key) => typeof context?.[key] === 'number').map((key) => `${key} ${context[key]}`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

/** The meaning of a public code from the server's registry (packages/errors/src/registry.ts). */
function byCode(code: string, meaning: FailureMeaning, context: Context): Why | undefined {
  if (isSignedOutCode(code)) return { code: 'signed-out', hint: 'Sign in again, then retry.' };
  switch (code) {
  case 'NETWORK':
    return { code: 'backend-unreachable', hint: 'Check the backend is running, then retry.', retryable: true };
  case 'ACCESS_SUSPENDED':
    return { code: 'database-unavailable' };
  case 'FORBIDDEN':
    return { code: 'permission-denied', ...(meaning.rows ? { hint: ROWS_REFUSED_HINT } : {}) };
  case 'READ_ONLY_TRANSACTION':
    return READ_ONLY;
  case 'RATE_LIMITED':
  case 'CONCURRENCY_LIMIT_REACHED':
    return rateLimited(undefined);
  case 'NONEXISTENT_TYPE':
    return unknownType(context);
  case 'STEP_UP_REQUIRED':
    return { code: 'step-up-required', message: 'this change needs a recent sign-in.', hint: 'Sign in again, then retry.' };
  case 'UNIQUE_VIOLATION':
    return duplicate(meaning);
  case 'EXCLUSION_VIOLATION':
    return { code: 'conflict' };
  case 'FOREIGN_KEY_VIOLATION':
    return FOREIGN_KEY;
  case 'NOT_NULL_VIOLATION':
    return meaning.notNull ? { code: 'conflict', ...meaning.notNull } : { code: 'invalid-input', hint: 'Give a value for every required column.' };
  case 'CHECK_VIOLATION':
  case 'BAD_USER_INPUT':
  case 'VALIDATION_FAILED':
    return { code: 'invalid-input' };
  case 'NOT_FOUND':
    return { code: 'not-found' };
  case 'BILLING_PLAN_REQUIRED':
    return { code: 'plan-required', hint: 'Choose a plan for this account under Billing → Plans in the Constructive dashboard, then retry.' };
  case 'LIMIT_REACHED':
  case 'BILLING_QUOTA_EXCEEDED':
    return { code: 'limit-reached', hint: 'Remove what this account no longer needs, or choose a larger plan under Billing → Plans in the Constructive dashboard, then retry.' };
  // Request protection: the limits the backend resolved for this API.
  case 'QUERY_TOO_COSTLY':
    return {
      code: 'query-too-large',
      message: `the query asks for more rows than this backend allows${measured(context, ['cost', 'limit'])}.`,
      hint: 'Add `first:` to each connection in the query, and ask for fewer nested lists.',
    };
  case 'QUERY_TOO_DEEP':
    return {
      code: 'query-too-large',
      message: `the query nests more levels than this backend allows${measured(context, ['depth', 'limit'])}.`,
      hint: 'Ask for fewer nested levels.',
    };
  case 'PAGE_SIZE_TOO_LARGE':
    return {
      code: 'query-too-large',
      message: `the query asks for more rows in one page than this backend allows${measured(context, ['requested', 'limit'])}.`,
      hint: 'Set `first:` on each connection to the limit or less.',
    };
  case 'REQUEST_TOO_LARGE':
    return {
      code: 'query-too-large',
      message: `the request body is larger than this backend allows${measured(context, ['bytes', 'limit'])}.`,
      hint: 'Send less in one request, for example fewer rows in each call.',
    };
  default:
    return BLUEPRINT_CODES.has(code) ? blueprintRefusal(context) : policyRefusal(code, meaning, context);
  }
}

// A request the backend limited: the step is to wait, as long as it asked when it said.
function rateLimited(seconds: number | undefined): Why {
  return {
    code: 'rate-limited',
    message: `the backend is limiting how many requests it takes${seconds === undefined ? '' : `, and asks to wait ${seconds} seconds`}.`,
    hint: seconds === undefined ? 'Wait a moment, then call again.' : `Wait ${seconds} seconds, then call again.`,
    retryable: true,
  };
}

// The types a field most often takes, and the words people write for them, for the hint of an unknown type.
const TYPE_WORDS: Record<string, string> = {
  text: 'text', string: 'text', varchar: 'text', citext: 'citext', integer: 'integer', int: 'integer', bigint: 'bigint', smallint: 'smallint',
  numeric: 'numeric', decimal: 'numeric', float: 'numeric', number: 'numeric', boolean: 'boolean', bool: 'boolean', date: 'date', time: 'time',
  timestamp: 'timestamp', timestamptz: 'timestamptz', datetime: 'timestamptz', uuid: 'uuid', json: 'json', jsonb: 'jsonb', inet: 'inet',
  email: 'email', url: 'url', image: 'image', upload: 'upload',
};

function unknownType(context: Context): Why {
  const given = context?.type as { name?: unknown; array_dimensions?: unknown } | string | undefined;
  const name = typeof given === 'string' ? given : typeof given?.name === 'string' ? given.name : undefined;
  const nearest = name === undefined ? undefined : nearestName(name.toLowerCase(), Object.keys(TYPE_WORDS));
  return {
    code: 'invalid-input',
    message: `the backend has no type${name === undefined ? ' of that name' : ` "${name}"`}: a field takes a PostgreSQL type, a type this platform adds (email, url, image, upload), or an enum of this database.`,
    hint: nearest ? `Did you mean "${TYPE_WORDS[nearest]}"?` : 'Give one of those, for example text, integer, boolean, timestamptz or uuid.',
  };
}

function byStatus(status: number, meaning: FailureMeaning): Why | undefined {
  if (status === 429) return rateLimited(undefined);
  if (status >= 500) {
    return { code: 'backend-unreachable', hint: 'Check the backend is running, then retry.', retryable: true };
  }
  if (status === 401) return { code: 'signed-out', hint: 'Sign in again, then retry.' };
  if (status === 403) return { code: 'permission-denied', ...(meaning.rows ? { hint: ROWS_REFUSED_HINT } : {}) };
  return undefined;
}

const codeOf = (error: GraphQLError): string | undefined => {
  const code = error?.extensions?.code;
  return typeof code === 'string' ? code : undefined;
};

const errorIdOf = (error: GraphQLError): string | undefined => {
  const id = error?.extensions?.errorId;
  return typeof id === 'string' ? id : undefined;
};

// An internal error: the server logs it under an error id, and its code and text are not for the person, so neither
// decides nor is shown.
const isInternal = (error: GraphQLError): boolean => error?.extensions?.class === 'internal' || errorIdOf(error) !== undefined;

const contextOf = (error: GraphQLError): Context => {
  const context = error?.extensions?.context;
  return context && typeof context === 'object' && !Array.isArray(context) ? (context as Record<string, unknown>) : undefined;
};

// A public code decides, with the context the server sent beside it.
function byPublicCode(error: GraphQLError, meaning: FailureMeaning): Why | undefined {
  if (isInternal(error)) return undefined;
  const context = contextOf(error);
  const why = byCode(codeOf(error) ?? '', meaning, context);
  return why && context ? { ...why, context } : why;
}

function classify(list: readonly GraphQLError[], meaning: FailureMeaning): Why | undefined {
  const why = decide(list, meaning, list.find(isInternal));
  // A limited request says how long to wait when the backend sent Retry-After.
  return why?.code === 'rate-limited' ? { ...why, ...rateLimited(retryAfterOf(list)) } : why;
}

function decide(list: readonly GraphQLError[], meaning: FailureMeaning, internal: GraphQLError | undefined): Why | undefined {
  return (
    list.map((error) => byPublicCode(error, meaning)).find(Boolean) ??
    (internal && meaning.policyTypes ? policyInternal(meaning, errorIdOf(internal)) : undefined) ??
    list.map((error) => byStatus(statusOf(error) ?? 0, meaning)).find(Boolean) ??
    (internal
      ? {
        code: 'failed',
        message: `the backend failed with an internal error.${errorIdOf(internal) ? ` Error id: ${errorIdOf(internal)}.` : ''}`,
        hint: 'Give the error id to the backend operator: it names the logged error.',
      }
      : undefined)
  );
}

/**
 * A failed backend answer as a failure. `action` says what was attempted
 * ("Failed to delete table \"posts\""); the meaning of the code follows it, or,
 * for a code with no sentence here, the code itself. The public code decides
 * first (packages/errors/src/registry.ts), then the HTTP status (the one the
 * server put inside the error first), then a masked internal error with its
 * id. A message's text never decides and is never shown.
 */
export function failureFromErrors(
  errors: readonly GraphQLError[],
  action: string,
  meaning: FailureMeaning = {},
): ToolFailure {
  const list = errors ?? [];
  const { message, ...why } = classify(list, meaning) ?? { code: 'failed' };
  const errorId = list.map(errorIdOf).find(Boolean);
  // A refusal on rows suggests the read of the table's rules, as data beside the hint.
  const calls = meaning.rows && (why.code === 'permission-denied' || why.code === 'no-rows-changed') ? { calls: [explainAccessCall(meaning.rows.table)] } : {};
  return { ...why, message: `${action}: ${message ?? `${answerText(list)}.`}`, ...(errorId ? { errorId } : {}), ...calls };
}

/**
 * A thrown error as a failure: a `ToolFailureError` keeps its own, an SDK
 * error is classified by its GraphQL errors, anything else is `failed`.
 */
export function failureFromError(err: unknown, action: string, meaning: FailureMeaning = {}): ToolFailure {
  if (err instanceof ToolFailureError) return err.failure;
  if (err instanceof BuildNotQueuedError) return noRowCreated(action, DESCRIBE_SCHEMA);
  const errors = (err as { errors?: unknown } | null)?.errors;
  if (Array.isArray(errors) && errors.length > 0) return failureFromErrors(errors as GraphQLError[], action, meaning);
  const detail = thrownText(err);
  if (err instanceof BlueprintBuildError) {
    return {
      code: 'failed',
      message: `${action}: ${detail}`,
      hint:
        'The backend queued the build, so check the tables that exist before you call again: another call queues the same tables a second time. ' +
        'If the message gives no reason, give the construction id to the backend operator.',
      calls: [DESCRIBE_SCHEMA],
    };
  }
  return { code: 'failed', message: `${action}: ${detail}` };
}
