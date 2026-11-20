// add_records, with the owner's id filled the way the rest of app building
// fills it. db-tools' add_records backfills only `entityId`, so a table whose
// rows belong to an owner through another key (a blueprint's entity table:
// `data_rooms.owner_id`) refuses every insert the agent sends without it. The
// generated app, plan_app's seed and verify's CRUD check all fill the columns
// `MetaIndex.ownerColumns` names with the signed-in user's id; this wrapper
// applies that same rule before the insert, for any table and any blueprint.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveDataToken, resolveProjectContext } from '@agentic-kit/pi';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import type { TSchema } from 'typebox';

import type { AppSpec } from '../../app-spec/contract/app-spec.types';
import { fieldRules } from '../../pipeline/field-hints';
import { SPEC_FILE } from '../../pipeline/view-file';
import { fetchLiveMeta } from './live-meta';
import { type FieldRules, MetaIndex, normalizeKey } from './live-meta-index';

type Row = Record<string, unknown>;
type AddRecordsParams = { table_name: string; records: Row[] };
type DbTool = ToolDefinition<TSchema, unknown>;

/** Each row with every owner column it leaves out (under either spelling) set to the user's id. */
export function withOwnerColumns(rows: readonly Row[], columns: readonly string[], userId: string) {
  return rows.map((row) => {
    const given = new Set(
      Object.entries(row)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key]) => normalizeKey(key)),
    );
    const missing = columns.filter((column) => !given.has(normalizeKey(column)));
    return missing.length
      ? { ...row, ...Object.fromEntries(missing.map((column) => [column, userId])) }
      : row;
  });
}

// The spec's `$currentUserId` hints mark owner columns `_meta` can't show.
async function specRules(cwd: string): Promise<FieldRules> {
  const text = await readFile(path.join(cwd, SPEC_FILE), 'utf8').catch((): null => null);
  if (!text) return {};
  try {
    return fieldRules(JSON.parse(text) as AppSpec);
  } catch {
    return {};
  }
}

/**
 * The params with the owner columns filled, or as they came whenever the
 * table, the schema or the session can't be read: add_records then reports
 * the failure in its own words.
 */
export async function fillOwnerColumns(
  params: AddRecordsParams,
  cwd: string,
): Promise<AddRecordsParams> {
  const resolved = await resolveProjectContext(cwd, { plane: 'data' });
  const endpoint = resolved.context?.dataEndpoint;
  if (!resolved.context || !endpoint) return params;
  const token = await resolveDataToken(resolved.context);
  if (!token.token || !token.userId) return params;
  const [tables, rules] = await Promise.all([fetchLiveMeta(endpoint, token.token), specRules(cwd)]);
  const index = new MetaIndex(tables, rules);
  const table = index.find(params.table_name);
  const columns = table ? index.ownerColumns(table) : [];
  if (!columns.length) return params;
  return { ...params, records: withOwnerColumns(params.records, columns, token.userId) };
}

const isAddRecords = (params: unknown): params is AddRecordsParams =>
  Boolean(
    params &&
    typeof (params as AddRecordsParams).table_name === 'string' &&
    Array.isArray((params as AddRecordsParams).records),
  );

export function withOwnerKeys(tool: DbTool): DbTool {
  if (tool.name !== 'add_records') return tool;
  return {
    ...tool,
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      const filled = isAddRecords(params)
        ? await fillOwnerColumns(params, ctx.cwd).catch(() => params)
        : params;
      return tool.execute(toolCallId, filled as typeof params, signal, onUpdate, ctx);
    },
  };
}
