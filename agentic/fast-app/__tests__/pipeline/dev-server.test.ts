import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DevServerManager, DevServerStopped } from '../../src/pipeline/dev-server';
import { freePort } from '../../src/pipeline/dev-server-port';

// A stand-in for `next dev`: it counts its starts, prints Next's ready lines
// for the port it was given, and stays up. It is one process from start to
// end, as `next dev` is: the sleep replaces the shell instead of forking after
// the ready lines. A kill of the group that lands during such a fork misses
// the new child on macOS, and that orphan would hold the test's pipes for 30 s.
function fakeApp(): { dir: string; starts: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'dev-server-test-'));
  const starts = path.join(dir, 'starts.log');
  const script = `sh -c 'echo start >> ${starts}; echo "  - Local:        http://localhost:$PORT"; echo " ✓ Ready in 1ms"; exec sleep 30'`;
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: script } }));
  return { dir, starts };
}

test('two callers that ensure the same app at once share one dev server', async () => {
  const { dir, starts } = fakeApp();
  const servers = new DevServerManager();
  try {
    const [a, b] = await Promise.all([servers.ensure(dir), servers.ensure(dir)]);
    assert.equal(a.port, b.port);
    assert.deepEqual([a.reused, b.reused].sort(), [false, true]);
    const { readFileSync } = await import('node:fs');
    assert.equal(readFileSync(starts, 'utf8').trim().split('\n').length, 1);
  } finally {
    servers.killAll();
  }
});

const hold = (port = 0) =>
  new Promise<Server>((resolve) => {
    const server = createServer();
    server.listen(port, () => resolve(server));
  });
const portOf = (server: Server) => (server.address() as { port: number }).port;

test('a restart waits for its old port to be let go, instead of moving the Preview to another origin', async () => {
  const held = await hold();
  const port = portOf(held);
  // Without a wait, a port still held is given up at once.
  assert.notEqual(await freePort(port), port);
  setTimeout(() => held.close(), 300);
  assert.equal(await freePort(port, 3_000), port);
});

/** A port the test hands out when it chooses, to hold a start mid-claim. */
function heldPort() {
  let give: (port: number) => void = () => {};
  const port = new Promise<number>((resolve) => {
    give = resolve;
  });
  return { freePort: () => port, give: () => freePort().then(give) };
}

const startsOf = async (file: string): Promise<number> => {
  const { existsSync, readFileSync } = await import('node:fs');
  return existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').length : 0;
};

test('a stop while a start waits for its port spawns nothing, and the start ends as stopped', async () => {
  const { dir, starts } = fakeApp();
  const held = heldPort();
  const servers = new DevServerManager(undefined, { freePort: held.freePort });
  try {
    const started = servers.ensure(dir);
    assert.equal(servers.status(dir).state, 'starting');
    servers.stop(dir);
    await held.give();
    await assert.rejects(started, DevServerStopped);
    assert.equal(servers.status(dir).state, 'stopped');
    assert.equal(await startsOf(starts), 0);
  } finally {
    servers.killAll();
  }
});

test('an abort while a start waits for its port ends the wait at once and spawns nothing', async () => {
  const { dir, starts } = fakeApp();
  const held = heldPort();
  const servers = new DevServerManager(undefined, { freePort: held.freePort });
  const abort = new AbortController();
  try {
    const started = servers.ensure(dir, { signal: abort.signal });
    abort.abort(new Error('stopped by the user'));
    await assert.rejects(started, /stopped by the user/);
    await held.give();
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(servers.status(dir).state, 'stopped');
    assert.equal(await startsOf(starts), 0);
  } finally {
    servers.killAll();
  }
});

test('a start whose port claim fails leaves no slot, so the next start claims a port again', async () => {
  const { dir, starts } = fakeApp();
  let claims = 0;
  const servers = new DevServerManager(undefined, {
    freePort: (preferred, waitMs) =>
      ++claims === 1 ? Promise.reject(new Error('EMFILE')) : freePort(preferred, waitMs),
  });
  try {
    await assert.rejects(servers.ensure(dir), /EMFILE/);
    assert.equal(servers.status(dir).state, 'stopped');
    assert.equal((await servers.ensure(dir)).reused, false);
    assert.equal(await startsOf(starts), 1);
  } finally {
    servers.killAll();
  }
});

test('a start that fails keeps what the server printed, for the agent to read', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'dev-server-test-'));
  const script = 'echo "Module not found: Cannot resolve ./missing"; exit 1';
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: script } }));
  const servers = new DevServerManager();
  try {
    await assert.rejects(servers.ensure(dir));
    assert.equal(servers.status(dir).state, 'stopped');
    assert.match(servers.log(dir), /Cannot resolve \.\/missing/);
  } finally {
    servers.killAll();
  }
});

const timers = () => process.getActiveResourcesInfo().filter((kind) => kind === 'Timeout').length;

test('a fresh restart keeps no timer running once the old server has exited', async () => {
  const { dir } = fakeApp();
  const servers = new DevServerManager();
  try {
    await servers.ensure(dir);
    const before = timers();
    await servers.ensure(dir, { fresh: true });
    assert.equal(timers(), before);
  } finally {
    servers.killAll();
  }
});

test('a fresh restart and a caller that arrives during it share one new server', async () => {
  const { dir, starts } = fakeApp();
  const servers = new DevServerManager();
  try {
    const first = await servers.ensure(dir);
    const [fresh, joined] = await Promise.all([
      servers.ensure(dir, { fresh: true }),
      servers.ensure(dir),
    ]);
    assert.equal(joined.port, fresh.port);
    assert.equal(fresh.port, first.port);
    assert.equal(await startsOf(starts), 2);
  } finally {
    servers.killAll();
  }
});
