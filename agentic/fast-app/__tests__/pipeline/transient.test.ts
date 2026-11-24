import assert from 'node:assert/strict';

import {
  blueprintCallError,
  isRebuildAnswer,
  retryTransient,
  retryTransientOnce,
} from '../../src/pipeline/transient';

test('a stop during the retry wait ends the call at once, without the second attempt', async () => {
  const stop = new AbortController();
  let attempts = 0;
  const started = Date.now();
  const call = retryTransientOnce(
    async () => {
      attempts += 1;
      throw new Error("Schema isn't ready");
    },
    { note: () => stop.abort(new Error('stopped')), signal: stop.signal, delayMs: 60_000 },
  );
  await assert.rejects(call, /stopped/);
  assert.equal(attempts, 1);
  assert.ok(Date.now() - started < 5_000);
});

test('a not-ready answer is retried once; any other error fails at once', async () => {
  let attempts = 0;
  const value = await retryTransientOnce(
    async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Schema is not yet ready');
      return 'ok';
    },
    { note: () => {}, delayMs: 1 },
  );
  assert.deepEqual([value, attempts], ['ok', 2]);

  attempts = 0;
  await assert.rejects(
    retryTransientOnce(
      async () => {
        attempts += 1;
        throw new Error('permission denied');
      },
      { note: () => {}, delayMs: 1 },
    ),
    /permission denied/,
  );
  assert.equal(attempts, 1);
});

test('a provision_blueprint failure after its build was queued is not retried; one before it is', async () => {
  const message = "Could not read the blueprint build's status: fetch failed.";
  const attemptsFor = async (constructionId: string | null) => {
    let attempts = 0;
    await assert.rejects(
      retryTransientOnce(
        async () => {
          attempts += 1;
          throw blueprintCallError(message, constructionId);
        },
        { note: () => {}, delayMs: 1 },
      ),
      /fetch failed/,
    );
    return attempts;
  };

  // The queued build carries on, so a second call would build the same tables again.
  assert.equal(await attemptsFor('con-1'), 1);
  assert.equal(await attemptsFor(null), 2);
});

test('a read waits out a schema rebuild across several tries, and still fails at once on a real error', async () => {
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls < 3) throw new Error('Could not read fields: HTTP 502: Bad Gateway');
    return 'model';
  };
  const notes: string[] = [];
  assert.equal(
    await retryTransient(flaky, { note: (text) => notes.push(text), delayMs: 1, retries: 3 }),
    'model',
  );
  assert.equal(calls, 3);
  assert.equal(notes.length, 2);

  let denied = 0;
  await assert.rejects(
    retryTransient(
      async () => {
        denied += 1;
        throw new Error('permission denied for table users');
      },
      { note: () => {}, delayMs: 1, retries: 3 },
    ),
    /permission denied/,
  );
  assert.equal(denied, 1);
});

test('an HTTP 500 is retried only for a read that says it may take one; a write fails at once', async () => {
  const attemptsWith = async (transient?: (message: string) => boolean) => {
    let attempts = 0;
    const work = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('GraphQL Error: HTTP 500: Internal Server Error');
      return 'model';
    };
    const options = { note: () => {}, delayMs: 1, retries: 3 };
    await (
      transient ? retryTransient(work, { ...options, transient }) : retryTransient(work, options)
    ).catch((): null => null);
    return attempts;
  };
  // The read-back after a schema change: the API answers 500 while it builds the new handler.
  assert.equal(await attemptsWith(isRebuildAnswer), 2);
  // A schema call may have run before its 500, so it isn't repeated.
  assert.equal(await attemptsWith(), 1);
});
