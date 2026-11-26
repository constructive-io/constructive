import { z } from 'zod';

/**
 * A tool a harness can run, described without reference to any harness.
 *
 * The vendor-specific parts of a tool definition are its parameter encoding
 * (pi wants TypeBox, an MCP server wants JSON Schema, dsh wants its own
 * `ToolDefinition`), the arguments its runner threads through `execute`, and
 * its terminal rendering. None of that is a property of the tool itself: what
 * `add_records` *is* is a name, a description the model reads, a parameter
 * shape, and a function from validated params to text plus structured details.
 *
 * So that is all this states. An adapter maps it onto its own runner
 * (`toPiTool` in `@agentic-kit/pi`), which is the only place a tool's
 * shape meets a harness SDK.
 */

/** Text the model reads back from a call. */
export interface HarnessToolText {
  type: 'text';
  text: string;
}

/** An image the model reads back from a call, base64-encoded. */
export interface HarnessToolImage {
  type: 'image';
  data: string;
  mimeType: string;
}

export type HarnessToolContent = HarnessToolImage | HarnessToolText;

/**
 * What a call does to state. A gate asks before every call that is not `read`.
 *
 * - `read` changes nothing.
 * - `destructive` can lose user data (drop a table or a column, cast a column
 *   to another type), deletes something the user set up for good (a template,
 *   an entity type), or swaps the database a project is bound to.
 * - `write` is every other change, also one that removes a unique constraint
 *   or a default: those keep the data.
 */
export type ToolEffect = 'read' | 'write' | 'destructive';

/** Every code a `ToolFailure` can carry. */
export const TOOL_FAILURE_CODES = [
  'invalid-input',
  'query-too-large',
  'rate-limited',
  'not-found',
  'name-taken',
  'conflict',
  'no-rows-changed',
  'partial',
  'permission-denied',
  'read-only',
  'unsupported',
  'plan-required',
  'limit-reached',
  'signed-out',
  'step-up-required',
  'app-signed-out',
  'no-env',
  'no-backend',
  'missing-credentials',
  'backend-unreachable',
  'account-mismatch',
  'db-missing',
  'db-suspended',
  'database-unavailable',
  'app-missing',
  'schema-unresolved',
  'binding-live',
  'binding-changed',
  'binding-not-saved',
  'env-write-failed',
  'reprovision-not-allowed',
  'pending-other',
  'provision-pending',
  'provision-stuck',
  'ticket-lost',
  'unverified',
  'failed'
] as const;

export type ToolFailureCode = (typeof TOOL_FAILURE_CODES)[number];

/**
 * What each code means for the caller, and who acts next (the caller, the
 * person, or the backend operator), in one sentence that is true for every tool
 * that returns it. A new code does not compile without its sentence.
 */
export const TOOL_FAILURE_MEANINGS: Record<ToolFailureCode, string> = {
  'invalid-input': 'The input is not valid for the tool, or not what the backend accepts: the caller fixes the value the message names and calls again.',
  'query-too-large': 'The request asks for more than this backend allows at once (rows, nesting, page size or body size): the caller asks for less and calls again.',
  'rate-limited': 'The backend is limiting how many requests it takes, and nothing is wrong with the call: the caller waits, as long as the message says when the backend gave a time, and calls again.',
  'not-found': 'Something the call names does not exist where the call looks, or this account cannot see it: the caller checks what exists and calls again with a name that does.',
  'name-taken': 'A name the call would create is already used, possibly in the form the backend stores it under: the caller chooses another name, or works with the one that exists.',
  conflict:
    'The change does not fit the state the database is in now (a unique or related value, rows a new required column cannot fill, a column of another type, or another change at the same moment): the caller reads the current state and changes it or the input before calling again.',
  'no-rows-changed': 'The backend answered without an error but changed or returned no row, because the row does not exist or this account may not change or read it: the caller checks that it exists before calling again.',
  partial: 'Part of what was asked was done and part was not, and the message says which: the caller repeats only the part that was not done.',
  'permission-denied': 'The backend refused the call for this account or person, by a grant or a rule: the access is for the person or an administrator of the database to give, so the same call fails until it changes.',
  'read-only': 'The request was read-only, so nothing changed, usually because the credential may only read: the person gives a credential that may write; the same credential fails the same way.',
  unsupported: 'This host or backend cannot do what the call needs, so nothing was changed: the same call fails until the host or the backend can do it.',
  'plan-required': 'The account needs an active billing plan before the backend does this: the person chooses a plan for the account, then the caller calls again.',
  'limit-reached': 'The account reached a limit of its plan: the person removes what the account no longer needs or chooses a larger plan, then the caller calls again.',
  'signed-out': 'There is no usable account credential (no one is signed in, the session expired, or the credential was rejected): the person signs in again, then the caller calls again.',
  'step-up-required': 'The change needs a recent sign-in: the person signs in again, then the caller repeats the call.',
  'app-signed-out': 'The call acts as a person signed in to the app, not as the account, and no one is signed in there: the person signs in to the app, then the caller calls again.',
  'no-env': 'The directory has no .env, so no database is bound to it: a database is created or bound for the directory (the person approves it), then the caller calls again.',
  'no-backend': 'No Constructive backend is chosen here: the person chooses one by signing in to it, then the caller calls again.',
  'missing-credentials': 'The binding or the session lacks something the call needs (a key of .env, an owner, or a credential): the caller follows the message, which usually binds the directory again, then calls again.',
  'backend-unreachable': 'The backend did not answer, or answered with a server error: the caller retries later, and tells the backend operator when it lasts.',
  'account-mismatch': 'The directory is bound to a database of another account than the one signed in: the person signs in to that account, or binds the directory to a database of this one.',
  'db-missing': 'The database the directory is bound to no longer exists on this backend, or this account lost access to it: the person binds the directory to another database, which replaces the binding only with their approval.',
  'db-suspended': 'The bound database is suspended: its data is kept, but nothing can read or change it until the person or the backend operator lifts the suspension.',
  'database-unavailable': 'The backend answered that the database is deleted or suspended: a retry fails until it is restored, which is for the person or the backend operator.',
  'app-missing':
    'The call works in the project\'s app, the directory has none, and this host does not create one: the person adds the app, or the code is generated another way from what the result gives, then the caller calls again.',
  'schema-unresolved': "The bound database's app schema could not be read, so nothing was changed: the caller retries, and tells the backend operator when it lasts.",
  'binding-live': 'The directory is bound to a live database already, so it was kept and nothing was replaced: replacing it is a separate change the person approves.',
  'binding-changed': "The directory's binding changed while the call ran, so nothing was replaced: the caller reads the binding again before deciding what to do.",
  'binding-not-saved': 'The database is ready, but its binding was not saved, so the directory is not bound to it: the caller calls again with the same name to bind it.',
  'env-write-failed': 'The database was created, but writing its binding to .env failed: the person fixes what the message says about the file, then the caller calls again with the same name to bind it.',
  'reprovision-not-allowed': 'This host replaces a database only after the person approves it in its own window, so nothing was replaced: the person replaces it there.',
  'pending-other': 'A database request with another name is still recorded for this directory: the caller finishes that one by calling again with its name, because another name starts a second database.',
  'provision-pending': 'The database was requested and is not ready yet: the caller calls again with the same input to keep waiting, because another name starts a second database.',
  'provision-stuck': 'The database is still not ready after many waits, and its request stays recorded, so no other database is requested meanwhile: the backend operator checks the provisioning jobs.',
  'ticket-lost': 'The recorded database request can no longer be found on the backend and nothing was created, so the record is cleared: calling again requests a new database.',
  unverified: 'The change was sent and the backend answered that it applied it, but reading the state back failed: it may or may not be as planned, so the caller reads it before anything else.',
  failed: 'The backend or the tool failed in a way no other code says, and the message says what: the caller decides from the message, and gives an error id, when there is one, to the backend operator.'
};

/** Why a call failed, for a caller that is not a model (a CLI, an MCP client); `TOOL_FAILURE_MEANINGS` says what each code means. */
export interface ToolFailure {
  code: ToolFailureCode;
  /** What failed, and the likely cause. */
  message: string;
  /** The next step, when there is one. */
  hint?: string;
  /** True when the same call can succeed later without any other change. */
  retryable?: boolean;
  /** The id the backend logged the error under, when it sent one: a person can report it. */
  errorId?: string;
  /**
   * The public context the backend sent with the error that decided the code,
   * for example `{ cost, limit }` of a query that is too large.
   */
  context?: Record<string, unknown>;
  /** The calls that help after this failure, with exact tool names and inputs. */
  calls?: ToolCallSuggestion[];
}

/**
 * A call a tool suggests next, as data: the exact tool name and input a model
 * would send. A value the caller must still choose is left out of `input`,
 * named in `choose`, and explained in `why`. A hint says the next step in
 * words and names no tool or parameter; an adapter turns this into its own
 * next step (a command line with a placeholder for each name in `choose`, for
 * example).
 */
export interface ToolCallSuggestion {
  tool: string;
  input: Record<string, unknown>;
  why: string;
  /** Inputs the caller must still choose, by parameter name. */
  choose?: string[];
}

/** What a model or a person reads for a failure: what failed, then the next step. */
export function failureText(failure: ToolFailure): string {
  return failure.hint ? `${failure.message} ${failure.hint}` : failure.message;
}

/**
 * What a call returns: content for the model, details for logs and UI.
 *
 * `details` is the tool's own structured record of what it did — the run log
 * stores it, a surface renders it, and tests assert on it, none of which should
 * have to parse the text meant for the model.
 */
export interface HarnessToolResult<TDetails = unknown> {
  content: HarnessToolContent[];
  details: TDetails;
  /** Present exactly when the call failed. */
  failure?: ToolFailure;
  /** The calls that follow a success, as data (a failure carries its own in `failure.calls`). */
  calls?: ToolCallSuggestion[];
  /**
   * Hint that the agent should stop after this batch of calls. Harnesses that
   * have no such notion ignore it.
   */
  terminate?: boolean;
}

/**
 * What a tool may know about the call it is serving.
 *
 * Deliberately thin: everything a Constructive tool needs is the directory the
 * session is rooted at (the project it resolves its context and credentials
 * from) and the signal that says the run was abandoned. A tool that reaches for
 * more than this is reaching into a harness.
 */
export interface HarnessToolContext {
  /** Working directory of the run — the project the tool acts on. */
  readonly cwd: string;
  /** Aborted when the run is cancelled, if the harness offers one. */
  readonly signal?: AbortSignal;
}

/**
 * A tool, parameterized by its zod parameter schema.
 *
 * Parameters are zod because that is where the descriptions the model reads
 * live, and every other encoding is derivable from it — an adapter converts,
 * the tool never does.
 */
export interface HarnessTool<TParams extends z.ZodType = z.ZodType, TDetails = unknown> {
  /** Name the model calls, snake_case. */
  name: string;
  /** Human-readable label for a surface. */
  label: string;
  /** Description the model reads to decide whether to call it. */
  description: string;
  /** One-line summary for a system prompt's tool list, when the harness has one. */
  promptSnippet?: string;
  /** Guideline bullets to append to the system prompt while this tool is active. */
  promptGuidelines?: string[];
  parameters: TParams;
  /** What every call of the tool does to state; a tool whose calls differ in effect is two tools. */
  effect: ToolEffect;
  execute(
    params: z.output<TParams>,
    ctx: HarnessToolContext
  ): Promise<HarnessToolResult<TDetails>>;
}

/** A tool of any parameter shape — what a registry or an adapter holds. */
export type AnyHarnessTool = HarnessTool<z.ZodType, any>;

// Control characters, the zero-width and bidirectional format characters, the
// byte order mark and the line and paragraph separators: they make a name read
// differently from what it is, in a prompt or a log.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const PLAIN_TEXT = /^[^\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]*$/;

// The backend cuts a table or field name to 63 characters, PostgreSQL's
// identifier length, so a longer name would not be the name stored.
const MAX_IDENTIFIER_LENGTH = 63;

// The backend stores labels (template and blueprint names, categories, tags,
// key and principal names, type names) as unbounded text; 256 is the bound it
// puts on the one label it does limit, a person's display name.
const MAX_TEXT_LENGTH = 256;

const plainText = (max: number) =>
  z
    .string()
    .min(1, { message: 'must not be empty' })
    .max(max, { message: `must be at most ${max} characters` })
    .regex(PLAIN_TEXT, { message: 'must not contain control, zero-width or bidirectional characters' });

// The fewest single-letter edits that turn one key into the other.
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/**
 * The candidate closest to `word`, letter case aside, when it is a likely typo of it: a few edits at most, more for a
 * longer word.
 */
export function nearestName(word: string, candidates: readonly string[]): string | undefined {
  const [nearest] = candidates
    .map((candidate) => ({ candidate, edits: distance(word.toLowerCase(), candidate.toLowerCase()) }))
    .sort((a, b) => a.edits - b.edits);
  return nearest && nearest.edits <= Math.max(2, Math.floor(word.length / 3)) ? nearest.candidate : undefined;
}

/** Words as one list in a sentence: "a", "a and b", "a, b and c" (or "or"). */
export const listed = (words: readonly string[], conjunction: 'and' | 'or' = 'and'): string =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} ${conjunction} ${words[words.length - 1]}`;

/**
 * An object of tool input that refuses a key it does not have, instead of
 * dropping it: a dropped key changes what the input means (`"permisive": false`
 * made a limit into a second permissive rule). The message names the key and
 * the nearest known one; `hints` says what a key of another shape is here.
 * null for an optional key reads as not given.
 */
// A host with strict function calling sends every optional key, as null when it means "not given". An optional key
// reads null that way; a key whose own schema takes null (a default to remove) keeps it, and a required key refuses it.
const takesNull = (schema: z.ZodType): boolean => {
  const parsed = schema.safeParse(null);
  return parsed.success && parsed.data === null;
};
const nullIsAbsent = (schema: z.ZodType): boolean => schema.safeParse(undefined).success && !takesNull(schema);

// The published JSON Schema stays the key's own: the preprocess step has no schema of its own.
function nullAsAbsent(schema: z.ZodType): z.ZodType {
  return nullIsAbsent(schema) && !schema.safeParse(null).success ? z.preprocess((value) => (value === null ? undefined : value), schema) : schema;
}

type SchemaDef = { type: string; innerType?: z.ZodType; out?: z.ZodType; element?: z.ZodType };
const defOf = (schema: z.ZodType): SchemaDef => (schema as unknown as { _zod: { def: SchemaDef } })._zod.def;
const WRAPPERS = new Set(['optional', 'nullable', 'default', 'prefault', 'readonly', 'catch', 'nonoptional']);

// The schema a value is checked against, through the wrappers that do not change its shape (and a pipe's output side).
function unwrapped(schema: z.ZodType): z.ZodType {
  let current = schema;
  for (;;) {
    const def = defOf(current);
    if (WRAPPERS.has(def.type) && def.innerType) current = def.innerType;
    else if (def.type === 'pipe' && def.out) current = def.out;
    else return current;
  }
}

/**
 * `value` as the tool sees it: null removed for each optional key whose schema
 * does not take null, at every depth of the objects and lists of `schema` (a
 * rule inside `policies`, for example). A key whose schema takes null keeps it,
 * and a required key keeps it for the parse to refuse. Pure; an adapter that
 * checks input before the tool runs uses it inside `z.preprocess`, and binds an
 * approval to what it returns.
 */
export function normalizeToolParams(schema: z.ZodType, value: unknown): unknown {
  const target = unwrapped(schema);
  const def = defOf(target);
  if (def.type === 'array' && def.element && Array.isArray(value)) return value.map((item) => normalizeToolParams(def.element as z.ZodType, item));
  if (def.type !== 'object' || typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const shape = (target as z.ZodObject).shape as Record<string, z.ZodType>;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]): Array<[string, unknown]> => {
      const keySchema = shape[key];
      // A key the schema does not have stays, for the strict parse to name.
      if (!keySchema) return [[key, item]];
      if (item === null) return nullIsAbsent(keySchema) ? [] : [[key, null]];
      return [[key, normalizeToolParams(keySchema, item)]];
    }),
  );
}

export function strictObject<T extends z.ZodRawShape>(what: string, shape: T, hints: Record<string, string> = {}) {
  const known = Object.keys(shape);
  const say = (key: string): string => {
    if (Object.hasOwn(hints, key)) return `"${key}" ${hints[key]}`;
    const nearest = nearestName(key, known);
    if (nearest) return `"${key}" is not a key of ${what}: use "${nearest}".`;
    return known.length ? `"${key}" is not a key of ${what}: its keys are ${listed(known)}.` : `"${key}" is not a key of ${what}: it takes none.`;
  };
  return z.strictObject(nullableKeys(shape), {
    error: (issue) => (issue.code === 'unrecognized_keys' ? issue.keys.map(say).join(' ') : undefined),
  });
}

// The keys parse to the same output, so the shape keeps its own type.
const nullableKeys = <T extends z.ZodRawShape>(shape: T): T =>
  Object.fromEntries(Object.entries(shape).map(([key, schema]) => [key, nullAsAbsent(schema as z.ZodType)])) as unknown as T;

/**
 * An object of tool input that keeps the keys it does not name, for a tool that checks the whole object itself
 * against a schema of its own; null for an optional key reads as not given, as in `strictObject`.
 */
export function looseObject<T extends z.ZodRawShape>(shape: T) {
  return z.looseObject(nullableKeys(shape));
}

/**
 * A name the backend stores as an identifier (a table, field, junction table
 * or entity prefix): 1 to 63 characters of plain text. A regex rather than a
 * refinement, so the check survives into the JSON Schema an adapter validates
 * with.
 */
export function identifierParam() {
  return plainText(MAX_IDENTIFIER_LENGTH);
}

/** A label or display text the backend stores as text: 1 to 256 characters of plain text. */
export function textParam() {
  return plainText(MAX_TEXT_LENGTH);
}

/**
 * An id parameter: a UUID in 8-4-4-4-12 hex form. Not RFC-strict, because
 * the backend also mints ids from an md5 hash.
 */
export function idParam() {
  return z.guid({ message: 'must be a UUID' });
}

/**
 * Identity, for inference.
 *
 * Assigning a tool to a variable typed as `HarnessTool` widens its params to
 * `z.ZodType` and loses `z.output` in `execute`; passing it through this keeps
 * both, exactly as pi's `defineTool` does for its own definitions.
 */
export function defineHarnessTool<TParams extends z.ZodType, TDetails = unknown>(
  tool: HarnessTool<TParams, TDetails>
): HarnessTool<TParams, TDetails> {
  return tool;
}
