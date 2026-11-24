import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildLiveMetaQuery,
  type GraphqlExecute,
  introspectMetaContract,
  parseLiveMetaTables,
  resolveLiveMetaQuery,
  TYPE_FIELDS_QUERY,
} from '../../../src/extensions/db-tools/live-meta';

const fixture = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'live-meta-diary-app.json'), 'utf8'),
) as unknown;

// The MetaTable contract served by api-diary-app.launchql.dev on 2026-08-03.
const LIVE_CONTRACT = new Set([
  'name',
  'schemaName',
  'fields',
  'indexes',
  'constraints',
  'foreignKeyConstraints',
  'primaryKeyConstraints',
  'uniqueConstraints',
  'relations',
  'inflection',
  'query',
  'storage',
  'search',
  'i18n',
  'realtime',
]);

test('selection includes only contract-served blocks', () => {
  const query = buildLiveMetaQuery(LIVE_CONTRACT);
  assert.ok(query.includes('relations {'), 'relations selected (served live)');
  assert.ok(query.includes('storage {'), 'capability blocks selected');
  assert.ok(!query.includes('scope'), 'scope not selected (absent from the live contract)');
  assert.ok(!query.includes('tableName'), 'tableName never selected (not in the contract)');
});

test('selection grows when the backend starts serving scope', () => {
  const query = buildLiveMetaQuery(new Set([...LIVE_CONTRACT, 'scope']));
  assert.ok(query.includes('scope { scope tier keyColumn entityTable source }'));
});

test('selection includes the SQL table name once the backend serves it', () => {
  const query = buildLiveMetaQuery(new Set([...LIVE_CONTRACT, 'tableName']));
  assert.ok(query.includes('tables { name tableName schemaName'));
});

test('selection shrinks for an older contract without relations', () => {
  const query = buildLiveMetaQuery(new Set(['name', 'query', 'fields', 'inflection']));
  assert.ok(!query.includes('relations'));
  assert.ok(!query.includes('storage'));
  assert.ok(query.includes('query { all one create update delete }'));
});

const typeFields = (...names: string[]) => ({ fields: names.map((name) => ({ name })) });

// A backend's answer to the contract introspection: MetaTable and MetaField.
const contract =
  (table: string[], field: string[] | null): GraphqlExecute =>
    async (query, variables) => {
      assert.equal(query, TYPE_FIELDS_QUERY);
      assert.deepEqual(variables, { tableType: 'MetaTable', fieldType: 'MetaField' });
      return {
        data: { table: typeFields(...table), field: field ? typeFields(...field) : null },
      };
    };

const BASE_FIELDS = ['name', 'type', 'isNotNull', 'hasDefault', 'isPrimaryKey', 'isForeignKey'];
const FORM_FACTS = [
  'allowedValues',
  'isRequiredOnCreate',
  'isWritableOnCreate',
  'isWritableOnUpdate',
];

test('introspection reads both contracts in one call', async () => {
  const found = await introspectMetaContract(contract(['name', 'query'], ['name', 'columnName']));
  assert.deepEqual(found, {
    table: new Set(['name', 'query']),
    field: new Set(['name', 'columnName']),
  });
});

test('introspection returns null when the type is missing', async () => {
  const execute: GraphqlExecute = async () => ({ data: { table: null, field: null } });
  assert.equal(await introspectMetaContract(execute), null);
});

test('a backend that serves the form facts gets them in every field and its junction flag', async () => {
  const query = await resolveLiveMetaQuery(
    'https://api-form-facts.example/graphql',
    contract([...LIVE_CONTRACT, 'isJunction'], [...BASE_FIELDS, 'columnName', ...FORM_FACTS]),
  );
  assert.match(
    query ?? '',
    / hasDefault } columnName allowedValues isRequiredOnCreate isWritableOnCreate isWritableOnUpdate } /,
  );
  assert.match(query ?? '', / isJunction } } }$/);
});

test('an older backend gets no form facts, with or without a MetaField type', async () => {
  for (const [endpoint, field] of [
    ['https://api-old-fields.example/graphql', BASE_FIELDS],
    ['https://api-no-field-type.example/graphql', null],
  ] as const) {
    const query =
      (await resolveLiveMetaQuery(
        endpoint,
        contract([...LIVE_CONTRACT], field ? [...field] : null),
      )) ?? '';
    for (const fact of ['columnName', ...FORM_FACTS, 'isJunction']) {
      assert.ok(!query.includes(fact), `${endpoint}: ${fact}`);
    }
    // The fields block they already accept, unchanged.
    assert.ok(
      query.includes(
        ' fields { name isNotNull hasDefault isPrimaryKey isForeignKey description enumValues { name values } type { gqlType isArray pgType subtype isNotNull hasDefault } } relations {',
      ),
    );
  }
});

test('resolveLiveMetaQuery introspects once per endpoint', async () => {
  let calls = 0;
  const execute: GraphqlExecute = async () => {
    calls += 1;
    return { data: { table: typeFields('name', 'query'), field: null } };
  };
  const first = await resolveLiveMetaQuery('https://api-cache-test.example/graphql', execute);
  const second = await resolveLiveMetaQuery('https://api-cache-test.example/graphql', execute);
  assert.equal(calls, 1);
  assert.equal(first, second);
});

test('fixture parses verbatim: real names, live relations, no transforms', () => {
  const tables = parseLiveMetaTables(fixture);
  assert.deepEqual(
    tables.map((t) => t.name),
    ['Entry', 'Bucket', 'File'],
  );

  const entry = tables[0];
  assert.equal(entry.query?.all, 'entrys', 'backend-served plural kept verbatim');
  assert.equal(entry.inflection?.tableType, 'Entry');

  const file = tables[2];
  assert.equal(file.relations?.belongsTo[0]?.type, 'buckets');
  assert.equal(file.relations?.belongsTo[0]?.keys[0]?.name, 'bucketId');
  assert.equal(file.storage?.isFilesTable, true);

  const bucket = tables[1];
  assert.equal(bucket.relations?.hasMany[0]?.fieldName, 'filesByTheirBucketId');
});

test('null operations survive parsing untouched', () => {
  const tables = parseLiveMetaTables({
    _meta: {
      tables: [
        {
          name: 'ReadOnly',
          query: { all: 'readOnlys', one: 'readOnly', create: null, update: null, delete: null },
        },
        null,
      ],
    },
  });
  assert.equal(tables.length, 1);
  assert.equal(tables[0].query?.create, null);
  assert.equal(tables[0].query?.delete, null);
  assert.equal(tables[0].query?.one, 'readOnly');
});
