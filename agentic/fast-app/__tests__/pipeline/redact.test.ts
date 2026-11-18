import assert from 'node:assert/strict';

import {
  EXCERPT_CHARS,
  EXCERPT_LINES,
  outputExcerpt,
  redact,
  redactCommand,
  redactJson,
} from '../../src/pipeline/redact';

// Shaped like the real thing, not real.
const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMWExN2I5Mi01OWFlIiwiZXhwIjoxNzkzMDc0NTUxfQ.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
const ANTHROPIC = 'sk-ant-api03-Zr8x1Qm4VtLs9Pq2Wn7Ke5Jd3Hf6Gb0Ca-9yXuTiRoEwQ';
const OWNER_PASSWORD = 'Correct-Horse-9!battery';

const leaks = (text: string, secrets: string[]) =>
  secrets.filter((secret) => text.includes(secret));

test('a command line keeps the command and its arguments, and no env value or token', () => {
  assert.equal(
    redactCommand(
      `CONSTRUCTIVE_TOKEN=${JWT} API_ENDPOINT=http://api.localhost/graphql pnpm run codegen`,
    ),
    'pnpm run codegen',
  );
  const curl = redactCommand(
    `curl -s -H "Authorization: Bearer ${JWT}" http://api-food-bank.localhost/graphql`,
  );
  assert.deepEqual(leaks(curl, [JWT]), []);
  assert.match(
    curl,
    /^curl -s -H "Authorization: \[redacted\]" http:\/\/api-food-bank\.localhost\/graphql$/,
  );
  assert.equal(
    redactCommand('psql --password hunter2 --api-key=abc123def456 -h db.localhost'),
    'psql --password [redacted] --api-key=[redacted] -h db.localhost',
  );
  // What the card shows of an ordinary build command stays as it was.
  for (const line of [
    'pnpm --silent lint:types',
    'pnpm --silent gen:resources --meta .constructive/meta.json --spec ../../.constructive/app-spec.json',
  ]) {
    assert.equal(redactCommand(line), line);
  }
});

test("a failing command's output loses every secret and keeps the error the user needs", () => {
  const output = [
    '> codegen',
    'Fetching schema from http://api-food-bank.localhost/graphql',
    `Error: request failed: 401 Unauthorized (Authorization: Bearer ${JWT})`,
    `ANTHROPIC_API_KEY=${ANTHROPIC}`,
    'DATABASE_ID=01a17b07-7154-7174-b5e0-128a7bb5e6d4',
    'PGPASSWORD="pg-s3cret-value"',
    `{"email":"owner@example.com","accessToken":"${JWT}","password":"hunter2-again"}`,
    'connect: postgres://owner:db-s3cret@db.localhost:5432/app failed',
    `signIn({"email":"owner@example.com","pass":"${OWNER_PASSWORD}"})`,
    "src/app/(app)/page.tsx(12,5): error TS2322: Type 'string' is not assignable to type 'number'.",
    'GET /shifts/01a17bc6-ff7c-7ea8-a0a2-fb568923351d 500',
  ].join('\n');
  const excerpt = outputExcerpt(output, [OWNER_PASSWORD]);
  assert.deepEqual(
    leaks(excerpt, [
      JWT,
      ANTHROPIC,
      '01a17b07-7154-7174-b5e0-128a7bb5e6d4',
      'pg-s3cret-value',
      'hunter2-again',
      'db-s3cret',
      OWNER_PASSWORD,
    ]),
    [],
  );
  // The error, the file and the failing route are still there to debug with.
  assert.match(excerpt, /error TS2322: Type 'string' is not assignable to type 'number'\./);
  assert.match(excerpt, /page\.tsx\(12,5\)/);
  assert.match(excerpt, /GET \/shifts\/01a17bc6-ff7c-7ea8-a0a2-fb568923351d 500/);
  assert.match(excerpt, /401 Unauthorized/);
  assert.match(excerpt, /ANTHROPIC_API_KEY=\[redacted\]/);
  // A JSON line keeps its quotes around the mark, so it still parses.
  const json = excerpt.split('\n').find((line) => line.startsWith('{"email"')) ?? '';
  assert.deepEqual(JSON.parse(json), {
    email: 'owner@example.com',
    accessToken: '[redacted]',
    password: '[redacted]',
  });
});

test('a call\'s arguments stay JSON that parses, with each secret as "[redacted]"', () => {
  const args = {
    email: 'owner@example.com',
    password: OWNER_PASSWORD,
    headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
    databaseUrl: 'postgres://owner:db-s3cret@db.localhost:5432/food_bank',
    note: 'Seeded with DATABASE_ID=01a17b07-7154-7174-b5e0-128a7bb5e6d4 from "the .env"',
    credentials: { apiKey: ANTHROPIC },
    definition: {
      tables: [{ table_name: 'volunteers', fields: [{ name: 'phone', type: 'text' }] }],
    },
  };
  const text = JSON.stringify(redactJson(args, [OWNER_PASSWORD]), null, 2);
  assert.deepEqual(
    leaks(text, [
      OWNER_PASSWORD,
      JWT,
      ANTHROPIC,
      'db-s3cret',
      '01a17b07-7154-7174-b5e0-128a7bb5e6d4',
    ]),
    [],
  );
  const parsed = JSON.parse(text);
  assert.equal(parsed.password, '[redacted]');
  assert.equal(parsed.credentials, '[redacted]');
  assert.deepEqual(parsed.headers, {
    Authorization: '[redacted]',
    'Content-Type': 'application/json',
  });
  assert.equal(parsed.databaseUrl, 'postgres://[redacted]@db.localhost:5432/food_bank');
  // What the call was about is all still there.
  assert.equal(parsed.email, 'owner@example.com');
  assert.deepEqual(parsed.definition, args.definition);
});

test('a known secret goes wherever it stands, even inside other text', () => {
  assert.equal(
    redact(`login failed for owner with ${OWNER_PASSWORD}.`, [OWNER_PASSWORD]),
    'login failed for owner with [redacted].',
  );
});

test('an excerpt is capped to its last lines and characters, for the session', () => {
  const long = Array.from({ length: 500 }, (_, i) => `line ${i}`).join('\n');
  const lines = outputExcerpt(long).split('\n');
  assert.equal(lines.length, EXCERPT_LINES);
  assert.equal(lines.at(-1), 'line 499');
  const wide = outputExcerpt('x'.repeat(10_000));
  assert.ok(wide.length <= EXCERPT_CHARS, `${wide.length}`);
});

test("an excerpt drops the terminal's colors, so a dev server's banner reads as text", () => {
  const banner =
    '\x1b[1m\x1b[38;2;173;127;168m▲ Next.js 16.4.2\x1b[39m\x1b[22m (Turbopack)\n' +
    '- Local:        http://localhost:63206\n' +
    '\x1b[32m\x1b[1m✓\x1b[22m\x1b[39m Ready in 284ms';
  assert.equal(
    outputExcerpt(banner),
    '▲ Next.js 16.4.2 (Turbopack)\n- Local:        http://localhost:63206\n✓ Ready in 284ms',
  );
});
