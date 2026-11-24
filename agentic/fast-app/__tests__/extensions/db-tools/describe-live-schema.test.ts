import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { formatLiveSchemaText } from '../../../src/extensions/db-tools/describe-live-schema-format';
import { parseLiveMetaTables } from '../../../src/extensions/db-tools/live-meta';

const fixture = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'live-meta-diary-app.json'), 'utf8'),
) as unknown;

test('fixture tables format with served names verbatim', () => {
  const tables = parseLiveMetaTables(fixture);
  const text = formatLiveSchemaText(tables, 'https://api-diary-app.launchql.dev/graphql');
  assert.ok(text.includes('3 tables'));
  assert.ok(text.includes('all=entrys'), 'backend-served naive plural kept verbatim');
  assert.ok(text.includes('belongsTo buckets via bucketsByMyBucketId (keys: bucketId)'));
  assert.ok(text.includes('hasMany files via filesByTheirBucketId'));
  assert.ok(text.includes('storage:buckets'));
  assert.ok(!text.includes('scope:'), 'no scope block in the live contract');
});

test('a null operation renders as none, not an invented name', () => {
  const text = formatLiveSchemaText([
    {
      name: 'AuditLog',
      query: { all: 'auditLogs', one: 'auditLog', create: null, update: null, delete: null },
    },
  ]);
  assert.ok(text.includes('all=auditLogs one=auditLog create=none update=none delete=none'));
  assert.ok(text.includes('"none" means the operation does not exist'));
});

test('empty table list reports an empty data plane', () => {
  const text = formatLiveSchemaText([], 'https://api-x.example/graphql');
  assert.equal(text, 'The live data plane from https://api-x.example/graphql serves no tables yet.');
});
