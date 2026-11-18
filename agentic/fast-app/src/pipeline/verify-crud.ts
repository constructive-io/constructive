// verify_app's CRUD check: create → get → update → delete on every table
// under test, through the app's generated ORM as the owner, in a child node
// process that runs the smoke script against the plan.

import { readFile, rm, writeFile } from 'node:fs/promises';

import { redactInStep } from './activity';
import { outputTail, runCommand } from './command';
import { type CrudSkip, planCrudSmoke } from './crud-plan';
import { lastJsonObject } from './gen';
import { RENDER_PAGE_BUDGET_MS, RENDER_SETUP_BUDGET_MS } from './render-budget';
import { findOrmEntry, writeSmokeFiles } from './smoke-script';
import type { CrudOwner, VerifyFailure, VerifyInput } from './verify';
import { classified } from './verify-fault';

const SMOKE_TIMEOUT_MS = 180_000;
// How long the smoke keeps its test rows for record pages to open on them: the
// render check's set-up, then one page per table it created a row in, each as
// long as the check lets a page take, and a margin. A safety net only: verify
// releases the rows as soon as the pages are open.
const HOLD_MARGIN_MS = 10_000;
const HOLD_MAX_MS = 600_000;
export const holdFor = (tables: number) =>
  Math.min(HOLD_MAX_MS, RENDER_SETUP_BUDGET_MS + RENDER_PAGE_BUDGET_MS * tables + HOLD_MARGIN_MS);
const HOLD_POLL_MS = 200;

/** A row the smoke created, by its `_meta` table name. */
export type HeldRow = { table: string; id: string };

type SmokeOutput = {
  setupError?: string;
  results?: Array<{ table: string; op: VerifyFailure['op']; ok: boolean; error?: string }>;
  /** Tables the smoke couldn't create in without leaving a row in a read-only one. */
  skipped?: CrudSkip[];
  /** Rows it created and couldn't delete. */
  leftover?: Array<{ table: string; id: string }>;
};

export type CrudCheck = {
  failures: VerifyFailure[];
  tested: string[];
  skipped: CrudSkip[];
  /**
   * Tables only read: the app can't delete from them. An entity type's table,
   * only read by design, isn't named: there is nothing for anyone to do.
   */
  readOnly: string[];
  leftover: Array<{ table: string; id: string }>;
};

/**
 * `onHeld` runs while the smoke's test rows exist, before it deletes them, so
 * verify can open record pages on them. The smoke goes on when it returns.
 */
export async function checkCrud(
  input: VerifyInput,
  owner: CrudOwner,
  onHeld?: (rows: HeldRow[]) => Promise<void>,
): Promise<CrudCheck> {
  const now = new Date();
  const plan = planCrudSmoke(input.tables, {
    stamp: now.getTime().toString(36),
    today: now.toISOString().slice(0, 10),
    now: now.toISOString(),
    ...(input.tablesUnderTest ? { only: input.tablesUnderTest } : {}),
    rules: input.rules,
    ...(input.entityTables ? { entityTables: input.entityTables } : {}),
  });
  const readOnly = plan.readOnly.filter((r) => !r.entity).map((r) => r.table);
  // The smoke didn't run (no ORM, a crash, a failed set-up): no table was tested.
  const ended = (failures: VerifyFailure[]): CrudCheck => ({
    failures,
    tested: [],
    skipped: plan.skipped,
    readOnly,
    leftover: [],
  });
  const ormEntry = findOrmEntry(input.appDir);
  if (!ormEntry) {
    return ended([
      {
        check: 'setup',
        message: 'No generated ORM in src/graphql/sdk/app; run_codegen did not write it.',
      },
    ]);
  }
  const holdMs = onHeld ? holdFor(plan.resources.length) : undefined;
  const files = await writeSmokeFiles(
    plan,
    { ormEntry, endpoint: owner.endpoint, userId: owner.userId },
    holdMs,
  );
  try {
    const run = runCommand(
      'node',
      ['--no-warnings', '--import', files.register, files.script, files.planFile],
      {
        cwd: input.appDir,
        env: { CONSTRUCTIVE_SMOKE_TOKEN: owner.token, NODE_ENV: undefined },
        signal: input.signal,
        timeoutMs: SMOKE_TIMEOUT_MS + (holdMs ?? 0),
      },
    );
    if (onHeld) await serveHold(files, run, onHeld);
    const result = await run;
    const output = lastJsonObject(result.output) as SmokeOutput | null;
    // The smoke runs the app's code with the owner's token in its environment:
    // what it printed is redacted before it reaches the result.
    if (!output) {
      return ended([
        {
          check: 'setup',
          message: `The CRUD smoke crashed:\n${redactInStep(outputTail(result.output, 15))}`,
        },
      ]);
    }
    if (output.setupError) {
      return ended([{ check: 'setup', message: redactInStep(output.setupError) }]);
    }
    const failures = (output.results ?? [])
      .filter((r) => !r.ok)
      .map(
        (r): VerifyFailure =>
          classified({
            check: 'crud',
            resource: r.table,
            op: r.op,
            message: r.error ?? 'failed',
          }),
      );
    const skipped = output.skipped ?? [];
    return {
      failures,
      tested: plan.resources.map((r) => r.table).filter((t) => !skipped.some((s) => s.table === t)),
      skipped: [...plan.skipped, ...skipped],
      readOnly,
      leftover: output.leftover ?? [],
    };
  } finally {
    void rm(files.dir, { recursive: true, force: true });
  }
}

// Waits for the smoke to hand over its rows (or end without holding), runs
// the callback on them, then releases the smoke, whatever the callback did.
async function serveHold(
  files: { rowsFile: string; releaseFile: string },
  run: Promise<unknown>,
  onHeld: (rows: HeldRow[]) => Promise<void>,
): Promise<void> {
  let ended = false;
  const end = () => {
    ended = true;
  };
  void run.then(end, end);
  let rows: HeldRow[] | null = null;
  while (!ended && !rows) {
    rows = await readFile(files.rowsFile, 'utf8')
      .then((text) => JSON.parse(text) as HeldRow[])
      .catch((): null => null);
    if (!rows) await new Promise((resolve) => setTimeout(resolve, HOLD_POLL_MS));
  }
  if (!rows) return;
  try {
    await onHeld(rows);
  } catch (err) {
    console.warn(`[fast-app] record pages on test rows: ${(err as Error).message}`);
  } finally {
    await writeFile(files.releaseFile, '').catch(() => {});
  }
}
