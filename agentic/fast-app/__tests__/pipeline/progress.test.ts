import assert from 'node:assert/strict';

import { PARAMS_CHARS, recordActivity } from '../../src/pipeline/activity';
import { BuildProgress, PhaseError } from '../../src/pipeline/progress';

const progress = (kind: 'app-build' | 'app-verify') =>
  new BuildProgress(
    { mark: () => {}, update: () => {} },
    { kind, name: 'Shifts', stage: 'building', phases: ['dev', 'codegen', 'verify'] },
  );

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lciJ9.c2lnbmF0dXJlLXZhbHVl';

const failure = async (run: Promise<unknown>) => {
  const err = await run.then(
    (): null => null,
    (error: unknown) => error,
  );
  assert.ok(err instanceof PhaseError);
  return err;
};

test('a phase\'s own error gets its fix; the backend\'s "not ready" gets the wait', async () => {
  const build = progress('app-build');
  const dev = await failure(
    build.run(
      'dev',
      async () => {
        throw new Error('The dev server was not ready after 90 s.');
      },
      { fix: 'Fix the error the dev server printed, then call verify_app.' },
    ),
  );
  assert.deepEqual(
    [dev.phase, dev.fix],
    ['dev', 'Fix the error the dev server printed, then call verify_app.'],
  );

  const codegen = await failure(
    build.run(
      'codegen',
      async () => {
        throw new Error("Schema isn't ready");
      },
      { fix: 'Read the codegen error.' },
    ),
  );
  assert.match(codegen.fix, /Wait a minute, then call plan_app again\.$/);

  const verify = await failure(
    progress('app-verify').run(
      'verify',
      async () => {
        throw new Error('schema is not yet ready');
      },
      { fix: 'Fix the error, then call verify_app again.' },
    ),
  );
  assert.match(verify.fix, /Wait a minute, then call verify_app again\.$/);
});

test("each step's calls land on its own list, also while two steps run at once", async () => {
  const build = new BuildProgress(
    { mark: () => {}, update: () => {} },
    { kind: 'app-build', name: 'Shifts', stage: 'building', phases: ['codegen', 'seed'] },
  );
  build.root = '/projects/shifts';
  build.addSecrets(['owner-pass-123']);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
  await Promise.all([
    build.run(
      'codegen',
      async () => {
        await tick();
        await recordActivity(
          { kind: 'command', label: 'pnpm run codegen', cwd: '/projects/shifts/packages/app' },
          tick,
          () => ({ exit: 0, output: `Generated 4 hooks\nsigned in with owner-pass-123\n${JWT}` }),
        );
      },
      { fix: '' },
    ),
    build.run(
      'seed',
      async () => {
        await recordActivity({ kind: 'call', label: 'insert', args: 'shifts ×3' }, tick);
        await tick();
        await recordActivity(
          {
            kind: 'call',
            label: 'signIn',
            args: 'owner-pass-123',
            params: { email: 'a@example.com', password: 'owner-pass-123', token: JWT },
          },
          tick,
        );
      },
      { fix: '' },
    ),
  ]);
  const activityOf = (phase: string) =>
    build.details.phases.find((p) => p.phase === phase)?.activity ?? [];
  const listOf = (phase: string) => activityOf(phase).map((a) => [a.label, a.args, a.cwd]);
  assert.deepEqual(listOf('codegen'), [['pnpm run codegen', undefined, 'packages/app']]);
  assert.deepEqual(listOf('seed'), [
    ['insert', 'shifts ×3', undefined],
    ['signIn', '[redacted]', undefined],
  ]);
  // What the card shows and copies is redacted: a command's output, kept
  // though it passed, and a call's arguments in full.
  const [codegen] = activityOf('codegen');
  assert.equal(codegen.exit, 0);
  assert.match(codegen.output ?? '', /^Generated 4 hooks\n/);
  const signIn = activityOf('seed')[1];
  assert.deepEqual(JSON.parse(signIn.params ?? ''), {
    email: 'a@example.com',
    password: '[redacted]',
    token: '[redacted]',
  });
  assert.equal(signIn.paramsCutAt, undefined);
  const shown = JSON.stringify(build.details);
  assert.equal(shown.includes('owner-pass-123'), false);
  assert.equal(shown.includes(JWT), false);
  // Outside a step, a call records nothing.
  await recordActivity({ kind: 'call', label: 'outside' }, tick);
  assert.equal(JSON.stringify(build.details).includes('outside'), false);
});

test("a blueprint's arguments past the cap are kept as an excerpt that says where it was cut", async () => {
  const build = progress('app-build');
  const tables = Array.from({ length: 80 }, (_, i) => ({
    table_name: `table_${i}`,
    fields: [
      { name: 'title', type: 'text' },
      { name: 'notes', type: 'text' },
    ],
  }));
  await build.run(
    'codegen',
    () =>
      recordActivity(
        {
          kind: 'call',
          label: 'provision_blueprint',
          params: { name: 'big', definition: { tables } },
        },
        async () => {},
      ),
    { fix: '' },
  );
  const [call] = build.details.phases.find((p) => p.phase === 'codegen')?.activity ?? [];
  assert.equal(call.paramsCutAt, PARAMS_CHARS);
  assert.equal(call.params?.length, PARAMS_CHARS);
});

test('a card ends in one stage: an end stage is final, and approval can only go forward', () => {
  const build = new BuildProgress(
    { mark: () => {}, update: () => {} },
    { kind: 'app-build', name: 'Shifts', stage: 'approval', phases: ['dev'] },
  );
  build.enter({ stage: 'building', startedAt: 1 });
  build.enter({ stage: 'done', warnings: ['Kept shifts.notes as it is.'] });
  assert.throws(() => build.enter({ stage: 'stopped' }));
  assert.deepEqual(
    [build.details.stage, build.details.warnings, build.details.startedAt],
    ['done', ['Kept shifts.notes as it is.'], 1],
  );
  const verify = progress('app-verify');
  assert.throws(() => verify.enter({ stage: 'approval' }));
});

test("a recheck that comes back clean drops the first run's gaps", () => {
  const verify = progress('app-verify');
  verify.renderCheck(
    { pages: 0, skipped: 'the sign-in failed' },
    { renderSkipped: 'the sign-in failed' },
  );
  assert.ok(verify.details.gaps);
  verify.renderCheck({ pages: 9 }, {});
  assert.equal(verify.details.gaps, undefined);
  assert.deepEqual(verify.details.renderCheck, { pages: 9 });
});

test("a step beside one that failed ends cancelled, not failed with the other step's error", async () => {
  const build = progress('app-build');
  const run = new AbortController();
  const failing = build.run(
    'codegen',
    async () => {
      throw new PhaseError('codegen', 'codegen broke', 'Read the codegen error.');
    },
    { fix: 'Read the codegen error.' },
  );
  const beside = build.run(
    'dev',
    () =>
      new Promise((_resolve, reject) => {
        run.signal.addEventListener('abort', () => reject(run.signal.reason));
      }),
    { fix: 'Fix the dev server.' },
  );
  await failing.catch((err: unknown) => run.abort(err));
  await beside.catch(() => {});
  const status = (phase: string) => build.details.phases.find((p) => p.phase === phase)?.status;
  assert.deepEqual([status('codegen'), status('dev')], ['failed', 'cancelled']);
});

test('a call the user stopped ends stopped, never failed; a failed one keeps its checks', () => {
  const checks = [{ check: 'routes', where: '/books', message: '500' }];
  const err = new PhaseError('verify', '1 check failed', 'Fix it.', checks);

  const stopped = progress('app-verify');
  assert.equal(stopped.endOnError(err, true), null);
  assert.equal(stopped.details.stage, 'stopped');
  assert.equal(stopped.details.failure, undefined);

  const failed = progress('app-build');
  assert.equal(failed.endOnError(err, false, { backendMs: 1200 }), err);
  assert.equal(failed.details.stage, 'failed');
  assert.equal(failed.details.failure?.phase, 'verify');
  assert.deepEqual(failed.details.checks, checks);
  assert.deepEqual(failed.details.timings, { backendMs: 1200 });

  // Not a step's failure: a bug, which must not read as a failed build.
  assert.throws(
    () => progress('app-build').endOnError(new TypeError('x is undefined'), false),
    TypeError,
  );
});
