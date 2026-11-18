import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { AppSpec } from '../../src/app-spec';
import { plannedScopeTree, scopeTreeFrom } from '../../src/app-spec/scope-tree';
import type { LiveMetaTable } from '../../src/extensions/db-tools/live-meta';
import { planCrudSmoke } from '../../src/pipeline/crud-plan';
import {
  blueprintFieldHints,
  fieldRules,
  personalDefaults,
  scopeFieldHints,
  withFieldHints,
  withPersonalDefaults,
} from '../../src/pipeline/field-hints';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const agentBlueprint = read(
  path.join(__dirname, '..', '..', 'src', 'blueprints', 'agent.json'),
);
const fundraiseBlueprint = read(
  path.join(__dirname, '..', '..', 'src', 'blueprints', 'fundraise.json'),
);
const agentMeta = read(path.join(__dirname, '__fixtures__', 'agent-meta.json')) as {
  tables: LiveMetaTable[];
};

const spec: AppSpec = {
  version: 1,
  name: 'Agent Desk',
  backend: { kind: 'blueprint', slug: 'agent' },
  ui: { resources: { agent_thread: { label: 'Threads', fields: { entityId: { label: 'Org' } } } } },
};

test('the agent blueprint: the owner fills the thread scope, children inherit theirs', () => {
  assert.deepEqual(blueprintFieldHints(agentBlueprint), {
    agent_thread: { entity_id: { hidden: true, default: '$currentUserId' } },
    agent_message: { entity_id: { hidden: true, required: false } },
    agent_task: { entity_id: { hidden: true, required: false } },
  });
});

test("hints merge under the spec's own field keys, and what the spec says wins", () => {
  const enriched = withFieldHints(spec, blueprintFieldHints(agentBlueprint));
  const resources = enriched.ui?.resources as Record<string, { label?: string; fields: object }>;
  assert.equal(resources.agent_thread.label, 'Threads');
  assert.deepEqual(resources.agent_thread.fields, {
    entityId: { hidden: true, default: '$currentUserId', label: 'Org' },
  });
  assert.deepEqual(resources.agent_task.fields, { entity_id: { hidden: true, required: false } });
  // The approved spec itself is left as it was.
  assert.deepEqual(Object.keys(spec.ui?.resources ?? {}), ['agent_thread']);
});

test('the CRUD smoke sends the owner id where hinted and leaves inherited columns to the trigger', () => {
  const rules = fieldRules(withFieldHints(spec, blueprintFieldHints(agentBlueprint)));
  const plan = planCrudSmoke(agentMeta.tables, {
    stamp: 'r1',
    today: '2026-10-19',
    now: '2026-10-19T10:00:00.000Z',
    rules,
  });
  const byTable = Object.fromEntries(plan.resources.map((r) => [r.table, r]));

  assert.deepEqual(byTable.AgentThread.create.entityId, { kind: 'userId' });
  // `_meta` says NOT NULL with no default; the hint says the parent's trigger fills it.
  assert.equal(byTable.AgentMessage.create.entityId, undefined);
  assert.equal(byTable.AgentTask.create.entityId, undefined);
  assert.deepEqual(byTable.AgentMessage.create.threadId, {
    kind: 'ref',
    table: 'AgentThread',
    model: 'agentThread',
    primaryKey: 'id',
  });
  const order = plan.resources.map((r) => r.table);
  assert.ok(order.indexOf('AgentThread') < order.indexOf('AgentMessage'));
});

test("a key an organization's membership guards follows the workspace; the smoke fills it with the owner", () => {
  const hints = blueprintFieldHints(fundraiseBlueprint);
  // AuthzEntityMembership(org) guards entity_id on every CRM table.
  assert.deepEqual(hints.contacts?.entity_id, { hidden: true, default: '$scope:org' });
  assert.deepEqual(hints.deals?.entity_id, { hidden: true, default: '$scope:org' });
  // A data room belongs to its parent organization, so a new room joins the active one;
  // before the database exists, the tree the blueprint will make says so.
  assert.deepEqual(scopeFieldHints(plannedScopeTree(fundraiseBlueprint)).data_rooms?.owner_id, {
    hidden: true,
    default: '$scope:org',
  });

  const rules = fieldRules(
    withFieldHints(
      { version: 1, name: 'Raise', backend: { kind: 'blueprint', slug: 'fundraise' } },
      hints,
    ),
  );
  const contacts: LiveMetaTable = {
    name: 'Contact',
    tableName: 'contacts',
    query: {
      all: 'contacts',
      create: 'createContact',
      update: 'updateContact',
      delete: 'deleteContact',
    },
    constraints: {
      primaryKey: { name: 'contacts_pkey', fields: [{ name: 'id' }] },
      foreignKey: [],
    },
    fields: [
      { name: 'id', type: { gqlType: 'UUID', isNotNull: true, hasDefault: true } },
      { name: 'firstName', type: { gqlType: 'String', isNotNull: true } },
      { name: 'entityId', type: { gqlType: 'UUID', isNotNull: true } },
    ],
  } as unknown as LiveMetaTable;
  const plan = planCrudSmoke([contacts], {
    stamp: 'r1',
    today: '2026-10-19',
    now: '2026-10-19T10:00:00.000Z',
    rules,
  });
  assert.deepEqual(plan.resources[0]?.create.entityId, { kind: 'userId' });
});

test("a live entity type's owner column follows its parent's workspace, whatever the column is called", () => {
  const tree = scopeTreeFrom({
    memberships: [{ scope: 'app' }, { scope: 'org' }, { scope: 'property' }, { scope: 'unit' }],
    storages: [],
    entityTypes: [
      {
        prefix: 'property',
        parentEntity: 'org',
        tableName: 'properties',
        ownerField: 'company_id',
      },
      // A child of another entity has no active one to take: its owner stays on the form.
      { prefix: 'unit', parentEntity: 'property', tableName: 'units', ownerField: 'property_id' },
    ],
  });
  const hints = scopeFieldHints(tree);
  assert.deepEqual(hints, {
    properties: { company_id: { hidden: true, default: '$scope:org' } },
  });
  // The agent's own hint on the column still wins.
  const custom: AppSpec = {
    version: 1,
    name: 'Steadfast',
    backend: { kind: 'custom', entities: [] },
    ui: { resources: { properties: { fields: { company_id: { label: 'Company' } } } } },
  };
  const merged = withFieldHints(custom, hints);
  assert.deepEqual(merged.ui?.resources?.properties?.fields?.company_id, {
    hidden: true,
    default: '$scope:org',
    label: 'Company',
  });
});

test("an app whose generator predates workspaces keeps the user's own id, and an old saved hint gives way to the workspace", () => {
  const hints = blueprintFieldHints(fundraiseBlueprint);
  // Its generator would send "$scope:org" as the column's value, whoever wrote it.
  assert.equal(personalDefaults(hints).contacts?.entity_id?.default, '$currentUserId');
  const own = withFieldHints(
    { version: 1, name: 'Raise', backend: { kind: 'blueprint', slug: 'fundraise' } },
    hints,
  );
  assert.equal(
    withPersonalDefaults(own).ui?.resources?.contacts?.fields?.entity_id?.default,
    '$currentUserId',
  );
  // An earlier desktop saved the user's id on the key; the workspace now fills it.
  const saved: AppSpec = {
    version: 1,
    name: 'Raise',
    backend: { kind: 'blueprint', slug: 'fundraise' },
    ui: {
      resources: {
        contacts: {
          fields: { entity_id: { hidden: true, default: '$currentUserId', label: 'Org' } },
        },
      },
    },
  };
  assert.deepEqual(withFieldHints(saved, hints).ui?.resources?.contacts?.fields?.entity_id, {
    hidden: true,
    default: '$scope:org',
    label: 'Org',
  });
});
