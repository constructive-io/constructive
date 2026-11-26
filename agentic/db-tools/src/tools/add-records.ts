import { type HarnessTool, type HarnessToolResult, identifierParam, strictObject,type ToolFailure } from '@agentic-kit/harness';
import {
  buildPostGraphileCreate,
  toCamelCaseSingular,
  toCreateMutationName,
} from '@constructive-io/graphql-query/generators';
import { z } from 'zod';

import type { ProjectContext } from '../context';
import { DESCRIBE_SCHEMA, explainAccessCall, failedResult, failureFromError, failureFromErrors, failureText, NO_NEW_ROW, noRowCreated, type Result } from '../failure';
import { answerText, classifyBackendErrors, type GraphQLError, statusAdapter, thrownText } from '../graphql-http';
import { appSessionReady, projectReady } from '../ready';
import { cleanTable, findMetaTable, META_QUERY, type MetaResponse, type RawMetaTable } from '../records/meta';

export type AddRecordsDetails = {
  success: boolean;
  message: string;
  tableName?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  createdCount?: number;
  asOf?: string;
  // Set when there's no valid data-plane token: the user hasn't signed into their
  // app in the Preview (or the session token expired). The renderer shows a
  // text prompt to sign in there.
  needsAuth?: boolean;
  // The app API answered ACCESS_SUSPENDED: the database is deleted or suspended.
  code?: 'database-unavailable';
  /** The rows that were not inserted: their place in `records` and what the backend said. */
  failedRows?: { index: number; message: string }[];
};

type ToolResult = HarnessToolResult<AddRecordsDetails>;

function fail(failure: ToolFailure, extra: Partial<AddRecordsDetails> = {}): ToolResult {
  return failedResult<AddRecordsDetails>(failure, { success: false, message: failureText(failure), ...extra });
}

const UNAVAILABLE =
  "The app database is unavailable: the backend answered ACCESS_SUSPENDED, so it was deleted or is suspended. Retrying won't help until it is restored.";

function unavailable(inserted = 0): ToolResult {
  const message = inserted > 0 ? `${UNAVAILABLE} ${inserted} row(s) were inserted before it stopped.` : `${UNAVAILABLE} No rows were inserted.`;
  return fail(
    { code: 'database-unavailable', message },
    { code: 'database-unavailable', ...(inserted > 0 ? { createdCount: inserted } : {}) },
  );
}

const isSuspended = (errors: readonly GraphQLError[]) => classifyBackendErrors(errors) === 'suspended';

// Mirror @constructive-io/data's prepareCreateInput (create semantics): drop
// undefined/null/empty-string so server defaults apply; keep false/0/[]/objects.
function stripForCreate(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out;
}

const AddRecordsZod = strictObject('the input', {
  table_name: identifierParam()
    .describe('Name of the table to insert rows into (snake_case, singular or plural).'),
  records: z
    .array(z.record(z.string(), z.unknown()))
    .describe(
      'Rows to insert. Each is an object of column → value (camelCase or snake_case column names).',
    ),
});

type AddRecordsParams = z.infer<typeof AddRecordsZod>;

type AddRecordsReady = {
  context: ProjectContext;
  token: string;
  userId?: string;
  /** The app's own API, as the person signed in to the app. */
  adapter: ReturnType<typeof statusAdapter>;
  tables: RawMetaTable[];
  table: RawMetaTable;
};

/** What add_records checks before it changes anything: rows to add, the project, its data endpoint, an app sign-in, and the table on the app's API. */
export async function addRecordsReady(params: AddRecordsParams, cwd: string): Promise<Result<AddRecordsReady>> {
  if (params.records.length === 0) return { kind: 'failed', failure: { code: 'invalid-input', message: 'No records provided.' } };
  const ready = await projectReady(cwd);
  if (ready.kind === 'failed') return ready;
  if (!ready.value.dataEndpoint) {
    return {
      kind: 'failed',
      failure: {
        code: 'missing-credentials',
        message: 'Cannot resolve the app data endpoint (DATABASE_NAME missing from .env).',
        hint: "Add DATABASE_NAME with the database's name to .env, then retry.",
      },
    };
  }
  const session = await appSessionReady(ready.value);
  if (session.kind === 'failed') return session;
  // Keeps the status and extensions.code that the SDK adapter drops.
  const adapter = statusAdapter(ready.value.dataEndpoint, { Authorization: `Bearer ${session.value.token}` });
  let tables: RawMetaTable[];
  try {
    const meta = await adapter.execute<MetaResponse>(META_QUERY);
    if (!meta.ok) {
      const failure = isSuspended(meta.errors)
        ? { code: 'database-unavailable' as const, message: `${UNAVAILABLE} No rows were inserted.` }
        : failureFromErrors(meta.errors, 'Failed to read schema from the app database');
      return { kind: 'failed', failure };
    }
    tables = (meta.data._meta?.tables ?? []).filter((t): t is NonNullable<typeof t> => Boolean(t)) as RawMetaTable[];
  } catch (err) {
    return { kind: 'failed', failure: failureFromError(err, 'Failed to query the app database schema') };
  }
  const table = findMetaTable(tables, params.table_name);
  if (!table) {
    return {
      kind: 'failed',
      failure: {
        code: 'not-found',
        message: `Table "${params.table_name}" was not found in the app database.`,
        hint: 'Check the table names that exist, then retry.',
        calls: [DESCRIBE_SCHEMA],
      },
    };
  }
  return { kind: 'ok', value: { context: ready.value, ...session.value, adapter, tables, table } };
}

export const addRecordsTool: HarnessTool<typeof AddRecordsZod, AddRecordsDetails> = {
  name: 'add_records',
  label: 'Add records',
  description: "Insert one or more rows into a table in the project's app database.",
  promptSnippet: 'add_records: insert rows into an existing table. Gated.',
  parameters: AddRecordsZod,
  effect: 'write',
  async execute(params: AddRecordsParams, ctx) {
    const ready = await addRecordsReady(params, ctx.cwd);
    if (ready.kind === 'failed') {
      const { code } = ready.failure;
      return fail(ready.failure, code === 'app-signed-out' ? { needsAuth: true } : code === 'database-unavailable' ? { code } : {});
    }
    const { userId, adapter, tables, table: rawTable } = ready.value;

    const table = cleanTable(rawTable);
    const allTables = tables.map(cleanTable);
    const mutation = buildPostGraphileCreate(table, allTables).toString();
    const mutationName = toCreateMutationName(table.name, table);
    const singularName = toCamelCaseSingular(table.name, table);

    // Constructive app tables scope rows by entityId (the owning user's id). The
    // create input requires it, but callers won't know it — backfill it with the
    // signed-in user's id from the Preview session when the table has the column
    // and the record omits it.
    const hasEntityId = table.fields.some((f) => f.name === 'entityId');

    const created: Record<string, unknown>[] = [];
    const errors: GraphQLError[] = [];
    const failedRows: { index: number; message: string }[] = [];

    for (const [index, record] of params.records.entries()) {
      const prepared =
        hasEntityId && userId && record.entityId == null && record.entity_id == null
          ? { ...record, entityId: userId }
          : record;
      const variables = { input: { [singularName]: stripForCreate(prepared) } };
      let rowErrors: GraphQLError[];
      try {
        const result = await adapter.execute<Record<string, unknown>>(mutation, variables);
        if (result.ok) {
          const payload = result.data?.[mutationName] as Record<string, unknown> | undefined;
          const row = payload?.[singularName] as Record<string, unknown> | undefined;
          if (row) {
            created.push(row);
          } else {
            failedRows.push({ index, message: NO_NEW_ROW });
          }
          continue;
        }
        if (isSuspended(result.errors)) return unavailable(created.length);
        rowErrors = result.errors;
      } catch (err) {
        // The request threw before any answer came back, so the error is the local one.
        rowErrors = [{ message: thrownText(err), extensions: { code: 'NETWORK' } }];
      }
      errors.push(...rowErrors);
      failedRows.push({ index, message: answerText(rowErrors) });
    }

    const columns = table.fields.map((f) => f.name);
    const rowDetails = {
      tableName: rawTable.name,
      columns,
      rows: created,
      createdCount: created.length,
      asOf: new Date().toISOString(),
    };

    if (created.length === 0) {
      const action = `Failed to insert into "${params.table_name}"`;
      const rows = { table: params.table_name };
      // A row the backend answers without was refused by, or is hidden by, the read rule.
      const hidden = {
        ...noRowCreated(action),
        hint: "The table's read rules may hide the new row from this person: read the rules of the table to see who they let read.",
        calls: [explainAccessCall(params.table_name)],
      };
      return fail(errors.length ? failureFromErrors(errors, action, { rows }) : hidden, { failedRows });
    }
    if (failedRows.length > 0) {
      const first = failedRows[0];
      return fail(
        {
          code: 'partial',
          message: `Inserted ${created.length} of ${params.records.length} rows into ${params.table_name}; ${failedRows.length} were not inserted (row ${first.index}: ${first.message}).`,
          hint: 'Fix the rows listed in details.failedRows, then call again with only those rows: the inserted rows stay.',
        },
        { ...rowDetails, failedRows },
      );
    }

    const message = `Inserted ${created.length} row(s) into ${params.table_name}.`;
    return { content: [{ type: 'text', text: message }], details: { success: true, message, ...rowDetails } };
  },
};
