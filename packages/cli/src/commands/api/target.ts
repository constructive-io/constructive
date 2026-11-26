import { CliError, type CommandContext, ExitCode, failureError, type NextStep } from '@agentic-kit/command';
import { failureFromErrors, postGraphQL } from '@agentic-kit/db-tools';
import type { PlanAccount, ToolFailure } from '@agentic-kit/harness';
import { stashDirectories } from '@agentic-kit/session';
import type { Dirent, Stats } from 'fs';
import { readdir, readFile, realpath, stat } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

import type { CliCode } from '../../errors';
import { activeAccount, type ActiveBackend, activeBackend, controlPlane, planAccount, type Session, signInSteps } from '../../session';

export const PLANES = ['api', 'auth', 'modules', 'agent', 'compute'] as const;
export type Plane = (typeof PLANES)[number];

const PLANE_ENDPOINT: Record<Plane, keyof ActiveBackend> = {
  api: 'apiEndpoint',
  auth: 'authEndpoint',
  modules: 'modulesEndpoint',
  agent: 'agentEndpoint',
  compute: 'computeEndpoint'
};

export interface TargetInput {
  plane?: Plane;
}

/** The flag that picks where a request goes; every api command takes it. */
export const TARGET_PROPERTIES = {
  plane: z.enum(PLANES).optional().describe('The plane of the session backend to send to (default: api)')
};

declare const planeEndpoint: unique symbol;

/** The endpoint of a plane of the session backend; only `resolveTarget` makes one, so a request can go nowhere else. */
export type PlaneEndpoint = string & { readonly [planeEndpoint]: true };

/** The credential a request carries: the session's, or none when no one is signed in (`why` says so). */
export type TargetCredential = { kind: 'session'; bearer: string; account: PlanAccount } | { kind: 'none'; why: string };

/** Where a request goes: always a plane of the session backend. */
export interface Target {
  plane: Plane;
  endpoint: PlaneEndpoint;
  credential: TargetCredential;
}

function usageError(message: string, hint: string, flag: string): CliError {
  return new CliError<CliCode>({ code: 'invalid-input', message, hint, exitCode: ExitCode.usage, details: { flag } });
}

function credentialOf(session: Session): TargetCredential {
  const account = activeAccount(session);
  if (!account) return { kind: 'none', why: 'No one is signed in, so no credential was sent.' };
  return { kind: 'session', bearer: controlPlane(session).bearer, account: planAccount(session) };
}

/** The plane `--plane` names (default api) of the session backend, with the session credential. */
export function resolveTarget(input: TargetInput, session: Session): Target {
  const backend = activeBackend(session);
  if (!backend) {
    throw new CliError<CliCode>({
      code: 'no-backend',
      message: 'No Constructive backend is chosen, so there is no plane to send to.',
      hint: 'Sign in to a backend first.',
      next: signInSteps(session)
    });
  }
  const plane = input.plane ?? 'api';
  return { plane, endpoint: backend[PLANE_ENDPOINT[plane]] as PlaneEndpoint, credential: credentialOf(session) };
}

/** The warnings a request's target carries: that it went with no credential. */
export const targetWarnings = (target: Target): string[] => (target.credential.kind === 'none' ? [target.credential.why] : []);

/** The flag of `input` that picks its target, as words, to repeat it in a next command. */
export function targetWords(input: TargetInput): string[] {
  return input.plane ? ['--plane', input.plane] : [];
}

/**
 * Sends one GraphQL request and returns its `data`. A failure, from the
 * transport or from the GraphQL errors, is thrown with the codes the tools use:
 * the public code and class of each error decide, then its HTTP status.
 */
/** The commands that help after a failed request. */
export type RequestNext = (failure: ToolFailure) => NextStep[];

export async function send(target: Target, body: Request, action: string, next: RequestNext): Promise<unknown> {
  const response = await postGraphQL<unknown>({
    endpoint: target.endpoint,
    headers: target.credential.kind === 'session' ? { Authorization: `Bearer ${target.credential.bearer}` } : {},
    ...body
  });
  if (response.errors.length === 0) return response.data;
  const details = { httpStatus: response.httpStatus, errors: response.errors, ...(response.data ? { data: response.data } : {}) };
  const failure = failureFromErrors(response.errors, action);
  throw failureError(failure, details, next(failure));
}

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

const realOrResolved = async (file: string): Promise<string> => realpath(file).catch(() => path.resolve(file));

/** The directories of every store this CLI can use: the current one, and the default one under the home directory. */
const storeDirectories = (env: NodeJS.ProcessEnv): string[] => [
  ...new Set([...stashDirectories(env), ...stashDirectories({ ...env, CONSTRUCTIVE_STASH_DIR: undefined })])
];

const identity = (stats: { dev: number; ino: number }): string => `${stats.dev}:${stats.ino}`;

/** The device and inode of every file under `directory`, so a hard link to one is known by what it is, not by its path. */
async function fileIdentities(directory: string, into: Set<string>): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true }).catch((): Dirent[] => []);
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await fileIdentities(full, into);
    else if (entry.isFile()) into.add(identity(await stat(full)));
  }
}

function storeFileError(flag: string, root: string): CliError {
  return usageError(`${flag} names a file in the session store (${root}), and the session store is never read as input.`, 'Pass a file outside the Constructive stash.', flag);
}

/**
 * Refuses a file of any session store this CLI can use, by its real path (a
 * symbolic link and --cwd resolved) and by device and inode (a hard link): a
 * command that reads must never send a stored credential anywhere.
 */
async function refuseStoreFile(file: string, flag: string, env: NodeJS.ProcessEnv): Promise<void> {
  const real = await realOrResolved(file);
  const roots = await Promise.all(storeDirectories(env).map(realOrResolved));
  for (const root of roots) {
    const relative = path.relative(root, real);
    if (relative === '' || (relative.split(path.sep)[0] !== '..' && !path.isAbsolute(relative))) throw storeFileError(flag, root);
  }
  const target = await stat(file).catch((): Stats | undefined => undefined);
  if (!target?.isFile()) return;
  for (const root of roots) {
    const identities = new Set<string>();
    await fileIdentities(root, identities);
    if (identities.has(identity(target))) throw storeFileError(flag, root);
  }
}

/** The text of a flag given as text, `@path` (from the working directory) or `-` (stdin). */
async function readSource(value: string, flag: string, ctx: CommandContext): Promise<string> {
  if (value === '-') return readAll(ctx.stdin);
  if (!value.startsWith('@')) return value;
  const file = path.resolve(ctx.cwd, value.slice(1));
  await refuseStoreFile(file, flag, ctx.env);
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code ?? (error as Error).message;
    throw usageError(`${flag} could not read ${file} (${reason}).`, 'Check the path; a relative path starts at the working directory.', flag);
  }
}

export interface Request {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

/** Where a value came from: text on the command line, a file, or stdin. */
export type Source = 'text' | 'file' | 'stdin';

const sourceOf = (value: string): Source => (value === '-' ? 'stdin' : value.startsWith('@') ? 'file' : 'text');

/** A request and where its variables came from, for a plan that must not show what came from a file or stdin. */
export interface ReadRequest {
  body: Request;
  variablesFrom?: Source;
}

/** The document and its variables, each given as text, `@path` or `-`; only one of them can come from stdin. */
export async function readRequest(input: { query: string; variables?: string; operation_name?: string }, ctx: CommandContext): Promise<ReadRequest> {
  if (input.query === '-' && input.variables === '-') {
    throw usageError('--query and --variables cannot both read stdin.', 'Pipe one of them, and pass the other as text or @file.', '--variables');
  }
  const query = await readSource(input.query, '--query', ctx);
  if (!query.trim()) throw usageError('The document is empty.', 'Pass a GraphQL document as text, @file.graphql, or - with the document on stdin.', '--query');
  if (input.variables === undefined) return { body: { query, operationName: input.operation_name } };
  const text = await readSource(input.variables, '--variables', ctx);
  let variables: unknown;
  try {
    variables = JSON.parse(text);
  } catch (error) {
    // The engine's message quotes the input, which may hold a secret, so only the position is kept.
    const position = /position (\d+)/.exec((error as Error).message)?.[1];
    const where = position ? ` (the error is at character ${position})` : '';
    throw usageError(`--variables is not valid JSON${where}.`, 'Pass a JSON object, for example --variables \'{"first":10}\'.', '--variables');
  }
  if (typeof variables !== 'object' || variables === null || Array.isArray(variables)) {
    throw usageError('--variables must be a JSON object.', 'Pass an object whose keys are the variable names, for example {"first":10}.', '--variables');
  }
  return {
    body: { query, variables: variables as Record<string, unknown>, operationName: input.operation_name },
    variablesFrom: sourceOf(input.variables)
  };
}
