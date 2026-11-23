import type { GraphQLQueryFnObj } from 'graphile-test';
import { getConnectionsObject, seed } from 'graphile-test';

import { ConstructivePreset } from '../src/presets/constructive-preset';

jest.setTimeout(120000);

// Enum labels are free text in PostgreSQL, but each must become a GraphQL
// enum value name ([_A-Za-z][_0-9A-Za-z]*). A label with a space or a dash
// used to stop the whole API from building. Each label below is stored in a
// row, read back through the API, and written through the API, so the names
// are checked end to end.
const enumSchema = `
  CREATE SCHEMA enum_names;

  CREATE TYPE enum_names.stage AS ENUM (
    'todo',
    'in_progress',
    'in progress',
    'on hold',
    'done-ish',
    'won''t fix',
    '1st review',
    '',
    '>',
    'straße',
    'café',
    '進行中',
    '完了',
    '🙂'
  );

  -- Labels that end up with the same name.
  CREATE TYPE enum_names.clash AS ENUM ('a b', 'a-b', 'Done', 'todo', 'done');

  CREATE TABLE enum_names.stage_items (
    id serial PRIMARY KEY,
    label text NOT NULL,
    value enum_names.stage NOT NULL
  );
  CREATE TABLE enum_names.clash_items (
    id serial PRIMARY KEY,
    label text NOT NULL,
    value enum_names.clash NOT NULL
  );

  INSERT INTO enum_names.stage_items (label, value)
    SELECT label::text, label FROM unnest(enum_range(NULL::enum_names.stage)) AS label;
  INSERT INTO enum_names.clash_items (label, value)
    SELECT label::text, label FROM unnest(enum_range(NULL::enum_names.clash)) AS label;
`;

// Label -> name. Non-Latin letters are first spelled in Latin letters
// ('café' -> 'cafe', '進行中' -> 'Jin Xing Zhong'). A name a label already had
// keeps it; other labels replace each run of characters outside [A-Za-z0-9_]
// with "_"; a name already taken, or a label with no letter or digit, gets a
// suffix made from the label.
const STAGE_NAMES: [string, string][] = [
  ['todo', 'TODO'],
  ['in_progress', 'IN_PROGRESS'],
  ['in progress', 'IN_PROGRESS_1X9GM11'],
  ['on hold', 'ON_HOLD'],
  ['done-ish', 'DONE_ISH'],
  ["won't fix", 'WON_T_FIX'],
  ['1st review', '_1ST_REVIEW'],
  ['', '_EMPTY_'],
  ['>', 'GREATER_THAN'],
  ['straße', 'STRASSE'],
  ['café', 'CAFE'],
  ['進行中', 'JIN_XING_ZHONG'],
  ['完了', 'WAN_LIAO'],
  ['🙂', '_OBEB0R']
];

// 'Done' and 'done' share DONE: the later label kept it before this change,
// so it keeps it now; the earlier one could not be read before.
const CLASH_NAMES: [string, string][] = [
  ['a b', 'A_B'],
  ['a-b', 'A_B_BSWM03'],
  ['Done', 'DONE_13CN9G1'],
  ['todo', 'TODO'],
  ['done', 'DONE']
];

type Row = { id: number; label: string; value: string };
type PgClient = Awaited<ReturnType<typeof getConnectionsObject>>['pg'];

describe('enum value names for any label', () => {
  let teardown: () => Promise<void>;
  let query: GraphQLQueryFnObj;
  let pg: PgClient;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: ['enum_names'],
        preset: { extends: [ConstructivePreset] },
        useRoot: true
      },
      [
        seed.fn(async ({ pg: client }) => {
          await client.query(enumSchema);
        })
      ]
    );
    teardown = connections.teardown;
    query = connections.query;
    pg = connections.pg;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  async function readRows(listField: string): Promise<Row[]> {
    const response = await query<Record<string, { nodes: Row[] }>>({
      query: `{ ${listField}(orderBy: ID_ASC) { nodes { id label value } } }`
    });
    expect(response.errors).toBeUndefined();
    return response.data![listField].nodes;
  }

  it.each([
    ['stageItems', STAGE_NAMES],
    ['clashItems', CLASH_NAMES]
  ])('reads every label of %s under a valid, unique name', async (listField, expected) => {
    const rows = await readRows(listField);
    expect(rows.map((row) => [row.label, row.value])).toEqual(expected);
  });

  it.each([
    ['createStageItem', 'stageItem', 'stage_items', STAGE_NAMES],
    ['createClashItem', 'clashItem', 'clash_items', CLASH_NAMES]
  ])('writes every name through %s and stores its label', async (mutation, recordField, tableName, expected) => {
    for (const [label, name] of expected) {
      const response = await query<Record<string, Record<string, { id: number }>>>({
        query: `mutation { ${mutation}(input: { ${recordField}: { label: "written", value: ${name} } }) { ${recordField} { id } } }`
      });
      expect(response.errors).toBeUndefined();
      const id = response.data![mutation][recordField].id;
      const stored = await pg.query(`SELECT value::text AS value FROM enum_names.${tableName} WHERE id = $1`, [id]);
      expect(stored.rows[0].value).toBe(label);
    }
  });
});
