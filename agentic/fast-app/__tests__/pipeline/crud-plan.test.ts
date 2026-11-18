import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { LiveMetaField, LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { planCrudSmoke } from '../../src/pipeline/crud-plan';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const FIXTURE = path.join(__dirname, '__fixtures__', 'crm-meta.json');
const crm = (JSON.parse(readFileSync(FIXTURE, 'utf8')) as { _meta: { tables: LiveMetaTable[] } })
  ._meta.tables;

const OPTIONS = { stamp: 'r1', today: '2026-10-19', now: '2026-10-19T10:00:00.000Z' };

test('plans the captured CRM schema parents first, with references to their targets', () => {
  const plan = planCrudSmoke(crm, OPTIONS);

  assert.deepEqual(
    plan.skipped.map((s) => [s.table, s.reason]),
    [
      ['Bucket', 'storage table'],
      ['File', 'storage table'],
    ],
  );
  const order = plan.resources.map((r) => r.table);
  assert.ok(order.indexOf('Contact') < order.indexOf('Deal'));
  assert.ok(order.indexOf('Contact') < order.indexOf('ContactTag'));
  assert.ok(order.indexOf('Tag') < order.indexOf('ContactTag'));

  const deal = plan.resources.find((r) => r.table === 'Deal');
  assert.deepEqual(deal, {
    table: 'Deal',
    model: 'deal',
    primaryKey: 'id',
    // stage has a default and amount is optional, so neither is sent.
    create: {
      title: { kind: 'literal', value: 'Smoke r1' },
      contactId: { kind: 'ref', table: 'Contact', model: 'contact', primaryKey: 'id' },
    },
    update: { field: 'title', value: 'Smoke r1 edited' },
    dependsOn: ['Contact'],
  });

  // An optional foreign key (Contact.companyId) is left out instead of forcing a parent.
  const contact = plan.resources.find((r) => r.table === 'Contact');
  assert.deepEqual(Object.keys(contact?.create ?? {}), ['firstName']);
  assert.deepEqual(contact?.dependsOn, []);
});

const field = (
  name: string,
  gqlType: string,
  extra: Partial<LiveMetaField> = {},
): LiveMetaField => ({
  name,
  isNotNull: true,
  hasDefault: false,
  isPrimaryKey: name === 'id',
  isForeignKey: false,
  type: {
    gqlType,
    isArray: false,
    pgType: gqlType.toLowerCase(),
    subtype: null,
    isNotNull: true,
    hasDefault: false,
  },
  ...extra,
});

const table = (
  name: string,
  fields: LiveMetaField[],
  extra: Partial<LiveMetaTable> = {},
): LiveMetaTable => ({
  name,
  query: {
    all: `${name.toLowerCase()}s`,
    create: `create${name}`,
    update: `update${name}`,
    delete: `delete${name}`,
  },
  inflection: { tableType: name },
  fields: [field('id', 'UUID', { hasDefault: true }), ...fields],
  constraints: {
    primaryKey: { name: `${name.toLowerCase()}s_pkey`, fields: [{ name: 'id' }] },
    unique: [],
    foreignKey: [],
  },
  ...extra,
});

const fk = (column: string, target: string) => ({
  name: `${column}_fkey`,
  fields: [{ name: column }],
  refTable: { name: target },
  refFields: [{ name: 'id' }],
});

test('required values: enums take the first value, owner and scope columns take the user id', () => {
  const shifts = table(
    'Shift',
    [
      field('status', 'ShiftStatus', {
        enumValues: { name: 'shift_status', values: ['open', 'filled'] },
      }),
      field('contactEmail', 'String', {
        type: {
          gqlType: 'String',
          isArray: false,
          pgType: 'email',
          subtype: null,
          isNotNull: true,
          hasDefault: false,
        },
      }),
      field('startsAt', 'Datetime'),
      field('ownerId', 'UUID'),
      field('orgId', 'UUID'),
    ],
    { scope: { scope: 'org', tier: 'app', keyColumn: 'orgId', entityTable: 'orgs', source: 'x' } },
  );
  const [plan] = planCrudSmoke([shifts], OPTIONS).resources;

  assert.deepEqual(plan.create, {
    status: { kind: 'literal', value: 'open' },
    contactEmail: { kind: 'literal', value: 'smoke+r1@example.com' },
    startsAt: { kind: 'literal', value: OPTIONS.now },
    ownerId: { kind: 'userId' },
    orgId: { kind: 'userId' },
  });
  // The only text column is an email, so the edited value stays a valid email.
  assert.deepEqual(plan.update, { field: 'contactEmail', value: 'smoke-edited+r1@example.com' });
});

test("a table the app can't delete from is only read; a chunk table's entity_id gets the user id", () => {
  const logs = table('Log', [field('message', 'String')], {
    query: { all: 'logs', create: 'createLog', update: 'updateLog' },
  });
  // An embedding's chunk table: entity_id is nullable, but its policy needs it.
  const chunks = table('CompaniesChunk', [field('entityId', 'UUID', { isNotNull: false })], {
    tableName: 'companies_chunks',
  });
  const plan = planCrudSmoke([logs, chunks], OPTIONS);

  // No test row goes where the app can't delete it.
  assert.deepEqual(plan.readOnly, [
    { table: 'Log', model: 'log', primaryKey: 'id', readOnly: true },
  ]);
  assert.deepEqual(
    plan.resources.map((r) => [r.table, r.create]),
    [['CompaniesChunk', { entityId: { kind: 'userId' } }]],
  );
});

test('tables the smoke cannot create are skipped with the reason, not failed', () => {
  const plan = planCrudSmoke(
    [
      table('Point', [field('location', 'GeoJSON')]),
      table('Node', [field('parentId', 'UUID')], {
        constraints: {
          primaryKey: { name: 'nodes_pkey', fields: [{ name: 'id' }] },
          unique: [],
          foreignKey: [fk('parentId', 'nodes')],
        },
      }),
      table('Hen', [field('eggId', 'UUID')], {
        constraints: {
          primaryKey: { name: 'hens_pkey', fields: [{ name: 'id' }] },
          unique: [],
          foreignKey: [fk('eggId', 'eggs')],
        },
      }),
      table('Egg', [field('henId', 'UUID')], {
        constraints: {
          primaryKey: { name: 'eggs_pkey', fields: [{ name: 'id' }] },
          unique: [],
          foreignKey: [fk('henId', 'hens')],
        },
      }),
    ],
    OPTIONS,
  );

  assert.deepEqual(plan.resources, []);
  assert.deepEqual(
    plan.skipped.map((s) => [s.table, s.reason]),
    [
      ['Point', 'no test value for required location (GeoJSON)'],
      ['Node', 'parentId is a required reference to its own table'],
      ['Hen', 'required references form a cycle'],
      ['Egg', 'required references form a cycle'],
    ],
  );
});

test('only limits the plan to the generated resources, in any spelling', () => {
  const plan = planCrudSmoke(crm, { ...OPTIONS, only: ['deals', 'contact_tags'] });
  assert.deepEqual(
    plan.resources.map((r) => r.table),
    ['Deal', 'ContactTag'],
  );
  // Deal still points at Contact; the smoke script finds an existing contact row.
  assert.deepEqual(plan.resources[0].dependsOn, ['Contact']);
});

test('check-constrained columns take their allowed values, never free text', () => {
  const shifts = table('Shift', [
    field('status', 'String', {
      type: {
        gqlType: 'String',
        isArray: false,
        pgType: 'text',
        subtype: null,
        isNotNull: true,
        hasDefault: false,
      },
    }),
    field('title', 'String', {
      isNotNull: false,
      type: {
        gqlType: 'String',
        isArray: false,
        pgType: 'text',
        subtype: null,
        isNotNull: false,
        hasDefault: false,
      },
    }),
  ]);
  const rules = { shifts: { status: { options: ['open', 'full', 'cancelled'] } } };
  const [plan] = planCrudSmoke([shifts], { ...OPTIONS, rules }).resources;

  assert.deepEqual(plan.create, { status: { kind: 'literal', value: 'open' } });
  // The edit goes to the free-text title, not into the constrained status.
  assert.deepEqual(plan.update, { field: 'title', value: 'Smoke r1 edited' });
});

test('skips the platform tables the site-hosting overlay adds to the app API', () => {
  const site: LiveMetaTable = {
    name: 'Site',
    query: { all: 'sites', create: 'createSite', update: 'updateSite', delete: 'deleteSite' },
    fields: [{ name: 'id', type: { gqlType: 'UUID', isArray: false } }],
    scope: {
      scope: 'database',
      tier: 'database',
      keyColumn: 'databaseId',
      entityTable: '',
      source: '',
    },
  } as LiveMetaTable;
  const plan = planCrudSmoke([...crm, site], OPTIONS);
  assert.deepEqual(plan.skipped.at(-1), { table: 'Site', reason: 'platform table' });
  assert.ok(!plan.resources.some((r) => r.table === 'Site'));
});

test("only reads an entity type's table, and keeps generated search and storage internals out", () => {
  const fixture = new URL('./__fixtures__/blueprint-generated-meta.json', moduleUrl);
  const tables = JSON.parse(readFileSync(fixture, 'utf8')) as LiveMetaTable[];
  const plan = planCrudSmoke(tables, { ...OPTIONS, entityTables: ['data_rooms'] });
  // A test room would come with memberships, a bucket and limits that the
  // backend, not the check, sets up and tears down.
  assert.deepEqual(
    plan.resources.map((resource) => resource.table),
    ['Company'],
  );
  assert.deepEqual(plan.readOnly, [
    { table: 'DataRoom', model: 'dataRoom', primaryKey: 'id', readOnly: true, entity: true },
  ]);
  assert.deepEqual(plan.skipped, [
    { table: 'CompaniesChunk', reason: 'search chunks' },
    { table: 'DataRoomBucket', reason: 'storage table' },
    { table: 'DataRoomFile', reason: 'storage table' },
    { table: 'DataRoomFileEvent', reason: 'storage module internals' },
    { table: 'DataRoomFilePathShare', reason: 'storage module internals' },
    { table: 'DataRoomFilesChunk', reason: 'search chunks' },
  ]);
});

test('a column the API takes no value for on create is left to the database', () => {
  // A trigger copies the unit's property onto each lease; the create input has no field for it.
  const leases = table('Lease', [
    field('tenantName', 'String'),
    { ...field('propertyId', 'UUID'), isWritableOnCreate: false, isWritableOnUpdate: true },
  ]);
  const [plan] = planCrudSmoke([leases], OPTIONS).resources;
  assert.deepEqual(Object.keys(plan.create), ['tenantName']);
});
