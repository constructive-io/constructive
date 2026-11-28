import { type ChangeCommand, CliError, ExitCode, type InputSchema, type Planned, type ReadCommand } from '@agentic-kit/command';
import { postGraphQL, provisionDatabase, type ProvisionDatabaseDetails } from '@agentic-kit/db-tools';
import { alignColumns } from '@agentic-kit/harness';
import { z } from 'zod';

import type { CliCode } from '../errors';
import {
  backendError,
  bindTools,
  boundDatabaseId,
  CLI_NAME,
  type ControlPlane,
  controlPlane,
  databaseLabel,
  databaseNext,
  type DatabaseState,
  databaseState,
  databaseText,
  dayOf,
  openSession,
  planAccount,
  type Session
} from '../session';

export interface DatabaseRow {
  id: string;
  name: string;
  ownerId: string | null;
  /** Owned by the signed-in account: only these can be bound with db use. */
  yours: boolean;
  /** The database this directory is bound to. */
  bound: boolean;
  createdAt: string | null;
}

type DatabaseNode = { id: string; name: string | null; ownerId: string | null; createdAt: string | null };

const LIST_DATABASES = `
  query ListDatabases {
    databases(first: 100, orderBy: [CREATED_AT_DESC]) {
      nodes { id name ownerId createdAt }
    }
  }`;

async function listDatabases(plane: ControlPlane, session: Session, cwd: string): Promise<DatabaseRow[]> {
  const response = await postGraphQL<{ databases: { nodes: DatabaseNode[] } | null }>({
    endpoint: plane.endpoint,
    headers: { Authorization: `Bearer ${plane.bearer}` },
    query: LIST_DATABASES
  });
  if (response.errors.length > 0) throw backendError(response, 'Listing the databases', session);
  const bound = await boundDatabaseId(cwd);
  return (response.data?.databases?.nodes ?? []).map((node) => ({
    id: node.id,
    name: node.name ?? '',
    ownerId: node.ownerId,
    yours: node.ownerId === plane.userId,
    bound: bound.status === 'valid' && node.id === bound.value,
    createdAt: node.createdAt
  }));
}

/** The databases as a table: `*` marks the bound one, and OWNER shows only when the list holds a database of another owner. */
function databasesText(rows: DatabaseRow[]): string {
  if (!rows.length) return 'No databases yet.';
  const owners = rows.some((row) => !row.yours);
  const table = alignColumns([
    ['', 'NAME', 'ID', 'CREATED', ...(owners ? ['OWNER'] : [])],
    ...rows.map((row) => [row.bound ? '*' : '', row.name ?? '', row.id, row.createdAt ? dayOf(row.createdAt) : '', ...(owners ? [row.yours ? 'you' : row.ownerId ?? ''] : [])])
  ]);
  return [...table, ...(rows.some((row) => row.bound) ? ['* bound to this directory'] : [])].join('\n');
}

const dbList: ReadCommand<InputSchema, DatabaseRow[]> = {
  name: 'db list',
  summary: 'List your databases',
  description: 'The newest 100 databases the signed-in account can see. In text, * marks the one this directory is bound to.',
  effect: 'read',
  async run(_input, ctx) {
    const session = await openSession(ctx);
    const rows = await listDatabases(controlPlane(session), session, ctx.cwd);
    return {
      data: rows,
      text: databasesText(rows),
      next: rows.some((row) => row.yours)
        ? [ctx.next(['db', 'use', { placeholder: 'name-or-id' }], 'Bind this directory to one of yours')]
        : [ctx.next(['db', 'create', { placeholder: 'name' }], 'Create a database for this directory')]
    };
  }
};

/** A failed provisionDatabase call, worded for the CLI where the host-side wording would not fit. */
function bindError(details: ProvisionDatabaseDetails, name: string): CliError {
  if (details.code === 'binding-live') {
    return new CliError<CliCode>({
      code: 'binding-live',
      message: `This directory is already bound to the live database ${details.databaseId}, so it was not bound to "${name}".`,
      hint: `Run "${CLI_NAME} db use" in a directory that is not bound yet, or remove DATABASE_ID from its .env first.`,
      details
    });
  }
  return new CliError<CliCode>({
    code: details.code ?? 'failed',
    message: details.message,
    exitCode: details.code === 'signed-out' ? ExitCode.signInRequired : ExitCode.failure,
    details
  });
}

const DbUseInput = z.object({ database: z.string().describe('Name or ID of the database, as db list shows it') });

const dbUse: ChangeCommand<typeof DbUseInput, unknown, Planned & { database: DatabaseRow }> = {
  name: 'db use',
  summary: 'Bind this directory to a database',
  description:
    'Writes the binding (DATABASE_ID, DATABASE_NAME and the endpoints) to the .env of this directory. Only a database the signed-in account owns can be bound, and only in a directory that is not bound to a live database yet.',
  effect: 'write',
  input: DbUseInput,
  positionals: ['database'],
  examples: [{ command: `${CLI_NAME} db use my-app --yes` }],
  async plan({ database }, ctx) {
    const session = await openSession(ctx);
    bindTools(session);
    const plane = controlPlane(session);
    const rows = await listDatabases(plane, session, ctx.cwd);
    const matches = rows.filter((row) => row.id === database || row.name === database);
    if (matches.length === 0) {
      throw new CliError<CliCode>({
        code: 'not-found',
        message: `This account sees no database named or with the ID "${database}".`,
        next: [ctx.next(['db', 'list'], 'List the databases you can bind')]
      });
    }
    if (matches.length > 1) {
      throw new CliError<CliCode>({
        code: 'invalid-input',
        message: `${matches.length} databases are named "${database}".`,
        hint: 'Pass the ID of the one you mean.',
        exitCode: ExitCode.usage,
        next: [ctx.next(['db', 'list'], 'See their IDs')]
      });
    }
    const [target] = matches;
    return {
      plan: {
        title: `Bind this directory to ${target.name ?? target.id}`,
        message: [`directory: ${ctx.cwd}`, `~ .env  -> ${databaseLabel(target.name, target.id)}`].join('\n'),
        target: {
          kind: 'database',
          database: { name: target.name, id: target.id },
          apiEndpoint: plane.endpoint,
          account: planAccount(session)
        }
      },
      database: target
    };
  },
  async apply(_input, { database: target }, ctx) {
    bindTools(await openSession(ctx));
    const details = await provisionDatabase({ databaseName: target.name, adopt: target.id }, { cwd: ctx.cwd, signal: ctx.signal });
    if (!details.success) throw bindError(details, target.name);
    return { data: details, text: details.message, next: [ctx.next(['schema', 'show'], 'See its tables')] };
  }
};

const dbStatus: ReadCommand<InputSchema, DatabaseState> = {
  name: 'db status',
  summary: 'Show whether the bound database is live',
  description:
    'Reads DATABASE_ID from the .env of this directory and asks the backend about it: found, suspended, missing (deleted, or access lost) or unreachable. ' +
    'A DATABASE_ID that is not a database id is invalid, and it is neither sent nor shown.',
  effect: 'read',
  async run(_input, ctx) {
    const session = await openSession(ctx);
    bindTools(session);
    const state = await databaseState(ctx.cwd);
    return { data: state, text: alignColumns([['database', databaseText(state)]]).join('\n'), next: databaseNext(state, session) };
  }
};

export const dbCommands = [dbList, dbUse, dbStatus];
