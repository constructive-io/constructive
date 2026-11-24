import assert from 'node:assert/strict';

import { mergeLiveModel, type SchemaTableInput, skewOf } from '../../src/app-spec/live-model';

// metaschema says what the schema tools made; `_meta` reads the database itself.

const shifts: SchemaTableInput = {
  id: 't1',
  name: 'shifts',
  access: 'shared',
  columns: [
    {
      id: 'f1',
      name: 'status',
      type: 'text',
      isRequired: false,
      default: null,
      allowedValues: ['open', 'full', 'cancelled'],
    },
  ],
  foreignKeys: [],
};

const merged = (meta: Parameters<typeof mergeLiveModel>[0]['meta']) =>
  mergeLiveModel({ schema: { databaseId: 'db-1', hash: 'h0', tables: [shifts] }, meta });

test('`_meta.allowedValues` wins over check values', () => {
  const model = merged([
    {
      name: 'Shift',
      tableName: 'shifts',
      fields: [{ name: 'status', allowedValues: ['open', 'closed'] }],
    },
  ]);
  assert.deepEqual(model.tables[0].columns[0].values, ['open', 'closed']);
  // Without `_meta`, the check's values stand.
  assert.deepEqual(merged(null).tables[0].columns[0].values, ['open', 'full', 'cancelled']);
});

test("a table `_meta` doesn't list yet has no columns changed with SQL", () => {
  const model = merged([{ name: 'Volunteer', tableName: 'volunteers', fields: [] }]);
  assert.equal(model.tables[0].columns[0].source, 'both');
  assert.deepEqual(skewOf(model), { metaOnly: new Map() });
});
