import assert from 'node:assert/strict';

import { seedPlan } from '../../src/app-spec/seed-plan';
import type { AppSpec } from '../../src/app-spec/types';
import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';

// The tests run at UTC+7 all year (Asia/Bangkok): jest.config.js sets TZ,
// because a jest test file can't change its worker's zone.

test('a naive seed time is the local wall-clock time, written with its offset', () => {
  const spec: AppSpec = {
    version: 1,
    name: 'Shifts',
    backend: {
      kind: 'custom',
      entities: [
        {
          name: 'shifts',
          fields: [
            { name: 'starts_at', type: 'timestamp' },
            { name: 'ends_at', type: 'timestamp' },
            { name: 'day', type: 'date' },
            { name: 'label', type: 'text' },
          ],
        },
      ],
    },
    seed: {
      shifts: [
        {
          starts_at: '2026-10-22T09:00',
          ends_at: '2026-10-22T13:30:00Z',
          day: '2026-10-22',
          label: '2026-10-22T09:00',
        },
      ],
    },
  };
  const [row] = seedPlan(spec)[0].rows;

  assert.equal(row.starts_at, '2026-10-22T09:00:00+07:00');
  assert.equal(new Date(String(row.starts_at)).toISOString(), '2026-10-22T02:00:00.000Z');
  // An offset, a date and a text column are written as given.
  assert.equal(row.ends_at, '2026-10-22T13:30:00Z');
  assert.equal(row.day, '2026-10-22');
  assert.equal(row.label, '2026-10-22T09:00');
});

test("a curated blueprint's time columns are found through _meta", () => {
  const spec: AppSpec = {
    version: 1,
    name: 'Agents',
    backend: { kind: 'blueprint', slug: 'agent' },
    seed: { agent_task: [{ due_at: '2026-10-22 17:45', description: '2026-10-22T17:45' }] },
  };
  const meta: LiveMetaTable[] = [
    {
      name: 'AgentTask',
      tableName: 'agent_task',
      fields: [
        {
          name: 'dueAt',
          type: {
            gqlType: 'Datetime',
            isArray: false,
            pgType: 'timestamptz',
            subtype: null,
            isNotNull: false,
            hasDefault: false,
          },
        },
        {
          name: 'description',
          type: {
            gqlType: 'String',
            isArray: false,
            pgType: 'text',
            subtype: null,
            isNotNull: true,
            hasDefault: false,
          },
        },
      ],
    },
  ];
  const [withMeta] = seedPlan(spec, meta)[0].rows;
  assert.equal(withMeta.due_at, '2026-10-22T17:45:00+07:00');
  assert.equal(withMeta.description, '2026-10-22T17:45');

  // Without _meta a naive date-time is taken for a time, since nothing says otherwise.
  const [bare] = seedPlan(spec)[0].rows;
  assert.equal(bare.description, '2026-10-22T17:45:00+07:00');
});
