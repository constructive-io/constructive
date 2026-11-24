'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

const {
  isApiSqlFile,
  extractSqlStatements,
  parsePairedDb,
  parseKitchenSinkRun,
  parsePairFromArtifact,
  evaluateGate,
} = require('./paired-change-gate.cjs');

/** Build a valid single-file ZIP buffer (method 0 stored or method 8 deflated). */
function makeZip(entries, deflate = false) {
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const [name, text] of Object.entries(entries)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.from(text, 'utf8');
    const data = deflate ? zlib.deflateRawSync(raw) : raw;
    const method = deflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    localParts.push(local, nameBuf, data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    cdParts.push(cd, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

function mockFetch(routes) {
  return async url => {
    const handler = routes[url];
    if (!handler) {
      return { ok: false, status: 404, text: async () => `Not found: ${url}` };
    }
    if (Buffer.isBuffer(handler)) {
      return { ok: true, status: 200, arrayBuffer: async () => handler };
    }
    return { ok: true, status: 200, json: async () => handler };
  };
}

test('isApiSqlFile matches API server sources and ignores tests/CLI/docs', () => {
  assert.equal(isApiSqlFile('graphile/graphile-presigned-url-plugin/src/plugin.ts'), true);
  assert.equal(isApiSqlFile('graphql/server/src/middleware/api.ts'), true);
  assert.equal(isApiSqlFile('packages/express-context/src/loader.ts'), true);
  assert.equal(isApiSqlFile('graphile/graphile-presigned-url-plugin/__tests__/plugin.test.ts'), false);
  assert.equal(isApiSqlFile('graphile/graphile-test/src/index.ts'), false);
  assert.equal(isApiSqlFile('packages/cli/src/index.ts'), false);
  assert.equal(isApiSqlFile('README.md'), false);
});

test('extractSqlStatements extracts template and single-quoted SQL literals', () => {
  const src = `
    const a = \`SELECT id, logical_key FROM \${filesQualifiedName} WHERE id = $1\`;
    const b = 'UPDATE';
    const c = 'SELECT 1 FROM pg_class';
  `;
  const stmts = extractSqlStatements(src);
  assert.equal(stmts.size, 2);
  assert.ok(stmts.has('SELECT id, logical_key FROM ${filesQualifiedName} WHERE id = $1'));
  assert.ok(stmts.has('SELECT 1 FROM pg_class'));
});

test('parsePairedDb parses PR refs, URLs, SHAs, branches, none, and rejects invalid', () => {
  assert.deepEqual(parsePairedDb('Paired-DB: none'), { kind: 'none', raw: 'none' });
  assert.deepEqual(parsePairedDb('Paired-DB: constructive-io/constructive-db#4477'), {
    kind: 'pr',
    number: 4477,
    raw: 'constructive-io/constructive-db#4477',
  });
  assert.deepEqual(
    parsePairedDb('Paired-DB: https://github.com/constructive-io/constructive-db/pull/4477'),
    {
      kind: 'pr',
      number: 4477,
      raw: 'https://github.com/constructive-io/constructive-db/pull/4477',
    },
  );
  const sha = 'a'.repeat(40);
  assert.deepEqual(parsePairedDb(`Paired-DB: ${sha}`), { kind: 'sha', sha, raw: sha });
  assert.equal(parsePairedDb('Paired-DB: bad value with spaces').kind, 'invalid');
  assert.equal(parsePairedDb('no trailer here'), null);
});

test('parseKitchenSinkRun parses run URLs and numeric IDs', () => {
  assert.deepEqual(
    parseKitchenSinkRun(
      'Kitchen-sink-run: https://github.com/constructive-io/constructive-db-integration-tests/actions/runs/45459984762',
    ),
    {
      runId: '45459984762',
      raw: 'https://github.com/constructive-io/constructive-db-integration-tests/actions/runs/45459984762',
    },
  );
  assert.deepEqual(parseKitchenSinkRun('Kitchen-sink-run: 12345'), {
    runId: '12345',
    raw: '12345',
  });
  assert.equal(parseKitchenSinkRun('Kitchen-sink-run: not-a-run').kind, 'invalid');
});

test('parsePairFromArtifact reads deflated pair.json and falls back to summary.md', () => {
  const dbSha = '1'.repeat(40);
  const cSha = '2'.repeat(40);
  const zipJson = makeZip(
    { 'pair.json': JSON.stringify({ constructiveDb: dbSha, constructive: cSha, scenario: 'all' }) },
    true,
  );
  assert.deepEqual(parsePairFromArtifact(zipJson), {
    constructiveDb: dbSha,
    constructive: cSha,
    scenario: 'all',
    grep: '',
  });

  const zipMd = makeZip(
    { 'summary.md': `# Storage integration run\n\n- constructive-db \`${dbSha}\` · constructive \`${cSha}\`\n` },
    true,
  );
  assert.deepEqual(parsePairFromArtifact(zipMd), {
    constructiveDb: dbSha,
    constructive: cSha,
    scenario: null,
  });
});

test('evaluateGate skips cleanly when no API SQL changed and no Paired-DB declared', async () => {
  const res = await evaluateGate({
    prBody: 'Just a CLI refactor',
    headSha: 'a'.repeat(40),
    changedSqlFiles: [],
    token: '',
  });
  assert.equal(res.ok, true);
  assert.equal(res.skipped, true);
});

test('evaluateGate blocks an API PR whose Paired-DB PR is not yet merged (DB-first order)', async () => {
  const cSha = 'c'.repeat(40);
  const dbSha = 'd'.repeat(40);
  const zip = makeZip(
    { 'pair.json': JSON.stringify({ constructiveDb: dbSha, constructive: cSha, scenario: 'all' }) },
    true,
  );
  const fetchImpl = mockFetch({
    'https://api.github.com/repos/constructive-io/constructive-db/pulls/4477': {
      state: 'open',
      merged_at: null,
      head: { sha: dbSha },
      merge_commit_sha: null,
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/runs/999': {
      id: 999,
      status: 'completed',
      conclusion: 'success',
      html_url: 'https://github.com/constructive-io/constructive-db-integration-tests/actions/runs/999',
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/runs/999/jobs?per_page=100': {
      jobs: [{ name: 'summary · all', conclusion: 'success' }],
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/runs/999/artifacts?per_page=100': {
      artifacts: [
        {
          name: 'storage-integration-summary-999',
          expired: false,
          archive_download_url: 'https://artifacts.example/999.zip',
        },
      ],
    },
    'https://artifacts.example/999.zip': zip,
  });

  const res = await evaluateGate({
    prBody: 'Paired-DB: constructive-io/constructive-db#4477\nKitchen-sink-run: 999',
    headSha: cSha,
    changedSqlFiles: [{ file: 'graphile/graphile-presigned-url-plugin/src/plugin.ts', addedCount: 1 }],
    token: 'tok',
    fetchImpl,
  });
  assert.equal(res.ok, false);
  assert.match(res.errors[0], /merge constructive-db first/);
});

test('evaluateGate passes when Paired-DB PR is merged and green kitchen-sink run tested the pair', async () => {
  const cSha = 'c'.repeat(40);
  const dbHeadSha = 'd'.repeat(40);
  const dbMergeSha = 'e'.repeat(40);
  const zip = makeZip(
    { 'pair.json': JSON.stringify({ constructiveDb: dbHeadSha, constructive: cSha, scenario: 'all' }) },
    true,
  );
  const fetchImpl = mockFetch({
    'https://api.github.com/repos/constructive-io/constructive-db/pulls/4477': {
      state: 'closed',
      merged_at: '2026-11-24T12:00:00Z',
      head: { sha: dbHeadSha },
      merge_commit_sha: dbMergeSha,
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/workflows/storage-integration.yml/runs?status=success&per_page=30': {
      workflow_runs: [
        {
          id: 1001,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/constructive-io/constructive-db-integration-tests/actions/runs/1001',
        },
      ],
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/runs/1001/jobs?per_page=100': {
      jobs: [{ name: 'summary · all', conclusion: 'success' }],
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/runs/1001/artifacts?per_page=100': {
      artifacts: [
        {
          name: 'storage-integration-summary-1001',
          expired: false,
          archive_download_url: 'https://artifacts.example/1001.zip',
        },
      ],
    },
    'https://artifacts.example/1001.zip': zip,
  });

  const res = await evaluateGate({
    prBody: 'Paired-DB: constructive-io/constructive-db#4477',
    headSha: cSha,
    changedSqlFiles: [{ file: 'graphile/graphile-presigned-url-plugin/src/plugin.ts', addedCount: 1 }],
    token: 'tok',
    fetchImpl,
  });
  assert.equal(res.ok, true);
  assert.equal(res.skipped, false);
  assert.match(res.message, /actions\/runs\/1001/);
});

test('evaluateGate fails an API SQL PR with no matching green kitchen-sink run', async () => {
  const cSha = 'c'.repeat(40);
  const dbPin = 'f'.repeat(40);
  const fetchImpl = mockFetch({
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/contents/pins.json': {
      content: Buffer.from(JSON.stringify({ constructiveDb: dbPin })).toString('base64'),
    },
    'https://api.github.com/repos/constructive-io/constructive-db/commits/main': {
      sha: dbPin,
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/workflows/storage-integration.yml/runs?status=success&per_page=30': {
      workflow_runs: [],
    },
  });

  const res = await evaluateGate({
    prBody: 'Reads logical_key without testing against DB',
    headSha: cSha,
    changedSqlFiles: [{ file: 'graphile/graphile-presigned-url-plugin/src/plugin.ts', addedCount: 2 }],
    token: 'tok',
    fetchImpl,
  });
  assert.equal(res.ok, false);
  assert.match(res.errors.join('\n'), /gh workflow run storage-integration\.yml/);
});

test('extractSqlStatements detects double-quoted and single-expression SELECT queries', () => {
  const src = `
    await pgClient.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    await pgClient.query(\`SELECT 1\`);
    const label = "Select an option to continue";
  `;
  const stmts = [...extractSqlStatements(src)];
  assert.equal(stmts.length, 2);
  assert.ok(stmts.includes('SELECT pg_advisory_xact_lock(hashtext($1))'));
  assert.ok(stmts.includes('SELECT 1'));
});

test('blank Paired-DB or Kitchen-sink-run lines do not swallow the following line', () => {
  assert.deepEqual(
    parsePairedDb('Paired-DB:\nKitchen-sink-run: 12345'),
    { kind: 'none', raw: '' },
  );
  assert.equal(
    parseKitchenSinkRun('Kitchen-sink-run:\n## Summary'),
    null,
  );
});

test('evaluateGate rejects a grep-filtered kitchen-sink run', async () => {
  const cSha = 'c'.repeat(40);
  const dbSha = 'd'.repeat(40);
  const zip = makeZip(
    {
      'pair.json': JSON.stringify({
        constructiveDb: dbSha,
        constructive: cSha,
        scenario: 'all',
        grep: 'smoke',
      }),
    },
    true,
  );
  const fetchImpl = mockFetch({
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/runs/777': {
      id: 777,
      status: 'completed',
      conclusion: 'success',
      html_url: 'https://github.com/constructive-io/constructive-db-integration-tests/actions/runs/777',
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/runs/777/jobs?per_page=100': {
      jobs: [{ name: 'summary · all', conclusion: 'success' }],
    },
    'https://api.github.com/repos/constructive-io/constructive-db-integration-tests/actions/runs/777/artifacts?per_page=100': {
      artifacts: [
        {
          name: 'storage-integration-summary-777',
          expired: false,
          archive_download_url: 'https://artifacts.example/777.zip',
        },
      ],
    },
    'https://artifacts.example/777.zip': zip,
  });

  const res = await evaluateGate({
    prBody: `Paired-DB: ${dbSha}\nKitchen-sink-run: 777`,
    headSha: cSha,
    changedSqlFiles: [{ file: 'graphile/graphile-presigned-url-plugin/src/plugin.ts', addedCount: 1 }],
    token: 'tok',
    fetchImpl,
  });
  assert.equal(res.ok, false);
  assert.match(res.errors.join('\n'), /filtered with grep/);
});
