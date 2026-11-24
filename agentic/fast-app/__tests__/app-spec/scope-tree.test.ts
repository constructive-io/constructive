import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  plannedScopeTree,
  scopeFeatureErrors,
  scopeTreeFrom,
  withPlannedScopes,
} from '../../src/app-spec/scope-tree';
import type { AppSpec } from '../../src/app-spec/types';

const fundraise = JSON.parse(
  readFileSync(path.join(__dirname, '..', '..', 'src', 'blueprints', 'fundraise.json'), 'utf8'),
);

const spec = (ui: AppSpec['ui']): AppSpec => ({
  version: 1,
  name: 'Raise',
  backend: { kind: 'blueprint', slug: 'fundraise' },
  ui,
});

test("a first build's tree: the app and org scopes, plus the blueprint's entity types", () => {
  const tree = plannedScopeTree(fundraise);
  assert.deepEqual(
    tree.map((info) => [
      info.scope,
      info.parent,
      info.entityTable,
      info.usersTable,
      info.visible,
      info.files,
    ]),
    [
      ['app', null, null, false, true, true],
      ['org', 'app', null, true, true, true],
      ['data_room', 'org', 'data_rooms', false, false, true],
    ],
  );
});

test('the live tree reads entity tables and storage from the modules API rows, for any entity type', () => {
  const tree = scopeTreeFrom({
    memberships: [{ scope: 'app' }, { scope: 'org' }, { scope: 'team' }],
    storages: [{ scope: 'app' }],
    entityTypes: [{ prefix: 'team', parentEntity: 'org', tableName: 'squads', isVisible: true }],
  });
  assert.deepEqual(
    tree.map((info) => [info.scope, info.entityTable, info.files]),
    [
      ['app', null, true],
      ['org', null, false],
      ['team', 'squads', false],
    ],
  );
});

test('accepts the screens the database can show, and says how to fix the ones it cannot', () => {
  const tree = plannedScopeTree(fundraise);
  assert.deepEqual(
    scopeFeatureErrors(
      spec({
        workspace: { scope: 'org' },
        access: ['app', 'org'],
        resources: { data_rooms: { panels: { scope: 'data_room', show: ['members', 'files'] } } },
      }),
      tree,
    ),
    [],
  );

  const errors = scopeFeatureErrors(
    spec({
      workspace: { scope: 'data_room' },
      access: ['data_room', 'team'],
      resources: {
        deals: { panels: { scope: 'data_room', show: ['members'] } },
        contacts: { panels: { scope: 'org', show: ['members'] } },
      },
    }),
    tree,
  );
  assert.deepEqual(
    errors.map((error) => error.path),
    [
      'ui.workspace.scope',
      'ui.access[0]',
      'ui.access[1]',
      'ui.resources.deals.panels.scope',
      'ui.resources.contacts.panels.scope',
    ],
  );
  assert.match(errors[1]!.message, /entity type: give its table "panels"/);
  assert.match(errors[3]!.message, /that is "data_rooms"/);
});

test('refuses files on an entity type without storage', () => {
  const tree = scopeTreeFrom({
    memberships: [{ scope: 'app' }, { scope: 'org' }, { scope: 'team' }],
    storages: [],
    entityTypes: [{ prefix: 'team', tableName: 'teams' }],
  });
  const errors = scopeFeatureErrors(
    spec({ resources: { teams: { panels: { scope: 'team', show: ['files'] } } } }),
    tree,
  );
  assert.deepEqual(
    errors.map((error) => error.path),
    ['ui.resources.teams.panels.show'],
  );
});

test("a first build on a database that exists is checked against its scopes plus the blueprint's", () => {
  // Right after provision_database: the preset's scopes, and no data_room yet.
  const live = scopeTreeFrom({
    memberships: [{ scope: 'app' }, { scope: 'org' }],
    storages: [{ scope: 'app' }],
    entityTypes: [],
  });
  const panels = spec({
    resources: { data_rooms: { panels: { scope: 'data_room', show: ['members', 'files'] } } },
  });
  assert.equal(scopeFeatureErrors(panels, live).length, 1);
  assert.deepEqual(
    scopeFeatureErrors(panels, withPlannedScopes(live, plannedScopeTree(fundraise))),
    [],
  );
});

test('a "$scope:" default names a scope with an active entity: a workspace', () => {
  const tree = scopeTreeFrom({
    memberships: [{ scope: 'app' }, { scope: 'org' }, { scope: 'properties' }],
    storages: [],
    entityTypes: [{ prefix: 'properties', parentEntity: 'org', tableName: 'propertiess' }],
  });
  const hinted = (value: string) =>
    spec({ resources: { units: { fields: { owner_id: { default: value } } } } });
  const errors = scopeFeatureErrors(hinted('$scope:properties'), tree);
  assert.deepEqual(
    errors.map((e) => e.path),
    ['ui.resources.units.fields.owner_id.default'],
  );
  assert.match(errors[0]!.message, /only a workspace scope has an active one/);
  assert.deepEqual(scopeFeatureErrors(hinted('$scope:org'), tree), []);
});
