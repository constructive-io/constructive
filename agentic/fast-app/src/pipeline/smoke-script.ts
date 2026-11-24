// The CRUD smoke that verify_app runs inside the generated app: plain Node,
// importing the app's generated ORM (TypeScript) through a resolve hook, so a
// pass proves the generated SDK works against the live API.

import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { CrudPlan } from './crud-plan';

// Generated code imports its siblings without an extension, imports types
// without `import type`, and pulls in a package directory with no exports map
// (`@constructive-io/graphql-query/runtime`). Node's resolver and type
// stripping refuse all three, so the hook resolves the file and index forms a
// bundler would, and compiles the app's own TypeScript with the app's own
// compiler (transpileModule drops imports that are only used as types).
const RESOLVE_HOOK = `import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUFFIXES = ['.ts', '.tsx', '.js', '/index.ts', '/index.tsx', '/index.js'];
const RETRY = new Set(['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT']);
const ts = createRequire(path.join(process.cwd(), 'package.json'))('typescript');

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (!RETRY.has(error?.code) || !context.parentURL || /\\.[cm]?[jt]sx?$/.test(specifier)) throw error;
    for (const suffix of SUFFIXES) {
      try {
        return await next(specifier + suffix, context);
      } catch {}
    }
    throw error;
  }
}

export async function load(url, context, next) {
  if (!/\\.tsx?$/.test(url) || url.includes('/node_modules/')) return next(url, context);
  const source = await readFile(fileURLToPath(url), 'utf8');
  const output = ts.transpileModule(source, {
    fileName: fileURLToPath(url),
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      verbatimModuleSyntax: false,
    },
  });
  return { format: 'module', source: output.outputText, shortCircuit: true };
}
`;

const REGISTER = `import { register } from 'node:module';
register('./resolve-hook.mjs', import.meta.url);
`;

/**
 * A failure of the backend's GraphQL server to build the app's API handler,
 * not of the app: it comes before the operation runs, so the operation can be
 * tried again, and the app's code has nothing to fix.
 */
export const BACKEND_HANDLER_ERROR =
  /Failed to create handler for|was invalidated while its handler was being built/;

const SMOKE = `import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const results = [];
const record = (table, op, ok, error) => results.push({ table, op, ok, ...(error ? { error } : {}) });
const errorText = (errors) =>
  (errors ?? []).map((e) => e?.message ?? String(e)).filter(Boolean).join('; ') || 'unknown error';
const firstValue = (value) => (value && typeof value === 'object' ? Object.values(value)[0] : undefined);

let db;
try {
  const orm = await import(pathToFileURL(plan.ormEntry).href);
  db = orm.createClient({
    endpoint: plan.endpoint,
    headers: { Authorization: 'Bearer ' + process.env.CONSTRUCTIVE_SMOKE_TOKEN },
  });
} catch (error) {
  const first = String(error?.message ?? error).split('\\n').slice(0, 2).join(' ');
  console.log(JSON.stringify({ setupError: 'The generated ORM failed to load: ' + first }));
  process.exit(0);
}

const created = new Map();
// Tables the smoke reads only; a row it made there would stay.
const readOnly = new Set(plan.readOnly.map((r) => r.table));
// Tables the check can't create in; a reference to one needs a row already there.
const uncreatable = new Map(plan.skipped.map((s) => [s.table, s.reason]));
const skipped = [];
const leftover = [];
async function existingId(ref) {
  if (created.has(ref.table)) return created.get(ref.table);
  const model = db[ref.model];
  if (!model) throw new Error('the ORM has no model "' + ref.model + '"');
  const result = await model.findMany({ first: 1, select: { [ref.primaryKey]: true } }).execute();
  if (!result.ok) throw new Error(errorText(result.errors));
  const row = firstValue(result.data)?.nodes?.[0];
  if (row) return row[ref.primaryKey];
  if (readOnly.has(ref.table)) {
    const gap = new Error(
      'no ' + ref.table + ' row to reference, and the app cannot delete one the check would make',
    );
    gap.skip = true;
    throw gap;
  }
  if (uncreatable.has(ref.table)) {
    const gap = new Error(
      'no ' + ref.table + ' row to reference, and the check cannot create one (' + uncreatable.get(ref.table) + ')',
    );
    gap.skip = true;
    throw gap;
  }
  throw new Error('no ' + ref.table + ' row to reference; seed one or create it first');
}

async function resolveValue(value) {
  if (value.kind === 'literal') return value.value;
  if (value.kind === 'userId') return plan.userId;
  if (value.kind === 'uuid') return crypto.randomUUID();
  return existingId(value);
}

const BACKEND_HANDLER_ERROR = new RegExp(${JSON.stringify(BACKEND_HANDLER_ERROR.source)});
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function attempt(res, op, run, retried = false) {
  let failure;
  try {
    const result = await run();
    if (result.ok) return result;
    failure = errorText(result.errors);
  } catch (error) {
    failure = error?.message ?? String(error);
  }
  // The backend failed before running the operation: once more, after a beat.
  if (!retried && BACKEND_HANDLER_ERROR.test(failure)) {
    await pause(2000);
    return attempt(res, op, run, true);
  }
  record(res.table, op, false, failure);
  return null;
}

for (const res of plan.resources) {
  const model = db[res.model];
  if (!model) {
    record(res.table, 'create', false, 'the generated ORM has no model "' + res.model + '"');
    continue;
  }
  const data = {};
  try {
    for (const [field, value] of Object.entries(res.create)) data[field] = await resolveValue(value);
  } catch (error) {
    if (error.skip) skipped.push({ table: res.table, reason: error.message });
    else record(res.table, 'create', false, error.message);
    continue;
  }
  const result = await attempt(res, 'create', () =>
    model.create({ data, select: { [res.primaryKey]: true } }).execute(),
  );
  const row = result && firstValue(firstValue(result.data));
  const id = row?.[res.primaryKey];
  if (result && !id) record(res.table, 'create', false, 'the create returned no ' + res.primaryKey);
  if (!id) continue;
  created.set(res.table, id);
  record(res.table, 'create', true);

  const got = await attempt(res, 'get', () =>
    model.findOne({ [res.primaryKey]: id, select: { [res.primaryKey]: true } }).execute(),
  );
  if (got) {
    const found = firstValue(got.data);
    record(res.table, 'get', Boolean(found), found ? undefined : 'the created row was not found');
  }

  if (res.update) {
    const updated = await attempt(res, 'update', () =>
      model
        .update({
          where: { [res.primaryKey]: id },
          data: { [res.update.field]: res.update.value },
          select: { [res.primaryKey]: true, [res.update.field]: true },
        })
        .execute(),
    );
    if (updated) {
      const after = firstValue(firstValue(updated.data))?.[res.update.field];
      const same = String(after) === String(res.update.value);
      record(res.table, 'update', same, same ? undefined : 'the update returned ' + JSON.stringify(after));
    }
  }
}

for (const res of plan.readOnly) {
  const model = db[res.model];
  if (!model) {
    record(res.table, 'get', false, 'the generated ORM has no model "' + res.model + '"');
    continue;
  }
  const read = await attempt(res, 'get', () =>
    model.findMany({ first: 1, select: { [res.primaryKey]: true } }).execute(),
  );
  if (read) record(res.table, 'get', true);
}

// Verify opens the record pages of empty tables on these test rows before
// they go: the smoke hands over its rows, then waits for the release (or the
// hold's deadline, so a stuck verify never keeps them).
if (plan.hold && created.size) {
  const rows = [...created].map(([table, id]) => ({ table, id: String(id) }));
  writeFileSync(plan.hold.rowsFile, JSON.stringify(rows));
  const until = Date.now() + plan.hold.ms;
  while (!existsSync(plan.hold.releaseFile) && Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

for (const res of [...plan.resources].reverse()) {
  const id = created.get(res.table);
  if (!id) continue;
  const model = db[res.model];
  const removed = await attempt(res, 'delete', () =>
    model.delete({ where: { [res.primaryKey]: id }, select: { [res.primaryKey]: true } }).execute(),
  );
  if (removed) record(res.table, 'delete', true);
  else leftover.push({ table: res.table, id: String(id) });
}

console.log(JSON.stringify({ results, skipped, leftover }));
`;

const ORM_ENTRIES = ['src/graphql/sdk/app/orm/index.ts', 'src/graphql/sdk/app/index.ts'];

export function findOrmEntry(appDir: string): string | null {
  for (const entry of ORM_ENTRIES) {
    const file = path.join(appDir, entry);
    if (existsSync(file)) return file;
  }
  return null;
}

export type SmokeFiles = {
  dir: string;
  script: string;
  register: string;
  planFile: string;
  /** The smoke writes its test rows here before deleting them, when it holds. */
  rowsFile: string;
  /** Written to let a holding smoke go on to its deletes. */
  releaseFile: string;
};

export async function writeSmokeFiles(
  plan: CrudPlan,
  context: { ormEntry: string; endpoint: string; userId: string },
  /** How long the smoke waits with its test rows in place; no hold without. */
  holdMs?: number,
): Promise<SmokeFiles> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'constructive-smoke-'));
  const files = {
    dir,
    script: path.join(dir, 'crud-smoke.mjs'),
    register: path.join(dir, 'register.mjs'),
    planFile: path.join(dir, 'plan.json'),
    rowsFile: path.join(dir, 'held-rows.json'),
    releaseFile: path.join(dir, 'release'),
  };
  const hold = holdMs
    ? { hold: { rowsFile: files.rowsFile, releaseFile: files.releaseFile, ms: holdMs } }
    : {};
  await Promise.all([
    writeFile(path.join(dir, 'resolve-hook.mjs'), RESOLVE_HOOK),
    writeFile(files.register, REGISTER),
    writeFile(files.script, SMOKE),
    writeFile(files.planFile, JSON.stringify({ ...plan, ...context, ...hold })),
  ]);
  return files;
}
