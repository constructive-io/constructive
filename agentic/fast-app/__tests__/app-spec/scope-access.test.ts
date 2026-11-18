import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { planDelta } from '../../src/app-spec/delta';
import { liveSpec } from '../../src/app-spec/live-spec';
import { linkTableName } from '../../src/app-spec/names';
import { scopeAccessErrors } from '../../src/app-spec/scope-access';
import { scopeTreeFrom } from '../../src/app-spec/scope-tree';
import { specModel } from '../../src/app-spec/spec-model';
import type { BlueprintTable } from '../../src/app-spec/translate';
import type { AppSpec, CustomBackend, SpecEntity, SpecLink } from '../../src/app-spec/types';
import { validateAppSpec } from '../../src/app-spec/validate';
import { accessFieldHints } from '../../src/pipeline/field-hints';
import { builtRecord } from '../pipeline/__fixtures__/built-record';
import { liveModelOf } from './__fixtures__/live-model-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

// Two tests of this file in the desktop run the pipeline's planner on the
// rendered spec ("the rendered spec keeps each scope access and hides its
// entity columns, so the same spec plans nothing" and "a curated entity type's
// added columns stay in app-spec.json, so the same spec plans nothing"). They
// need build-plan, plan-live and view-sync, so they come with the pipeline.

// A property manager: vendors belong to an organization; units to a property,
// an entity type manage_entity_types made; leases to a unit, so to its property.
const tree = scopeTreeFrom({
  memberships: [{ scope: 'app' }, { scope: 'org' }, { scope: 'properties' }],
  storages: [],
  entityTypes: [
    {
      prefix: 'properties',
      parentEntity: 'org',
      tableName: 'propertiess',
      ownerField: 'owner_id',
      membershipType: 3,
    },
  ],
});
const entityTables = new Map([['propertiess', new Set(['id', 'name', 'owner_id'])]]);

const spec: AppSpec = {
  version: 1,
  name: 'Steadfast',
  backend: {
    kind: 'custom',
    entities: [
      {
        name: 'vendors',
        access: { scope: 'org' },
        fields: [{ name: 'company_name', type: 'text', required: true }],
      },
      {
        name: 'units',
        access: { scope: 'properties' },
        fields: [{ name: 'unit_label', type: 'text', required: true }],
        belongsTo: [{ field: 'property_id', to: 'propertiess', onDelete: 'cascade' }],
      },
      {
        name: 'leases',
        access: { scope: 'properties' },
        fields: [{ name: 'tenant_name', type: 'text', required: true }],
        belongsTo: [{ field: 'unit_id', to: 'units', onDelete: 'cascade' }],
      },
    ],
    links: [{ between: ['units', 'vendors'] }],
  },
};

const entity = (of: AppSpec, name: string): SpecEntity => {
  const found = (of.backend as CustomBackend).entities.find((e) => e.name === name);
  assert.ok(found, name);
  return found;
};

function tablesOf(next: AppSpec): Map<string, BlueprintTable> {
  const planned = planDelta(null, next, { scopes: tree, entityTables });
  if (planned.ok === false) assert.fail(JSON.stringify(planned.refused));
  const call = planned.delta.calls.find((c) => c.tool === 'provision_blueprint');
  const { tables } = (call?.params as { definition: { tables: BlueprintTable[] } }).definition;
  return new Map(tables.map((table) => [table.table_name, table]));
}

const typeOf = (node: BlueprintTable['nodes'][number]) =>
  typeof node === 'string' ? node : node.$type;
const nodeOf = (table: BlueprintTable | undefined, type: string) =>
  table?.nodes.find((node) => typeOf(node) === type);

test("a scoped table lets only its entity's members in, through the column that names the entity", () => {
  const tables = tablesOf(spec);
  const policy = (name: string) => tables.get(name)?.policies.map((p) => [p.$type, p.data]);

  // An organization's rows: the org ownership column, as a curated CRM has it.
  assert.deepEqual(nodeOf(tables.get('vendors'), 'DataOwnershipInEntity'), {
    $type: 'DataOwnershipInEntity',
    data: { entity_field: 'entity_id' },
  });
  assert.deepEqual(policy('vendors'), [
    ['AuthzEntityMembership', { entity_field: 'entity_id', entity_type: 'org' }],
  ]);
  // A unit names its property by its key. db-tools gives an entity membership
  // policy a DataEntityMembership node that keys the column to the users
  // table unless the table has one: this one reuses the declared column.
  const reuse = (field: string) => ({
    $type: 'DataEntityMembership',
    data: { entity_field_name: field, include_id: false, include_user_fk: false },
  });
  assert.deepEqual(nodeOf(tables.get('units'), 'DataEntityMembership'), reuse('property_id'));
  assert.deepEqual(nodeOf(tables.get('leases'), 'DataEntityMembership'), reuse('property_id'));
  // A unit names its property by its key.
  assert.deepEqual(policy('units'), [
    [
      'AuthzEntityMembership',
      { entity_field: 'property_id', entity_type: 'properties', membership_type: 3 },
    ],
  ]);
  // A lease copies its unit's property, and a trigger fills it.
  assert.deepEqual(nodeOf(tables.get('leases'), 'DataInheritFromParent'), {
    $type: 'DataInheritFromParent',
    data: { parent_fk_field: 'unit_id', parent_table: 'units', fields: ['property_id'] },
  });
  assert.deepEqual(
    tables.get('leases')?.fields?.map((f) => f.name),
    ['unit_id', 'property_id', 'tenant_name'],
  );
  assert.deepEqual(policy('leases'), [
    [
      'AuthzEntityMembership',
      { entity_field: 'property_id', entity_type: 'properties', membership_type: 3 },
    ],
  ]);
  // A link to a unit is the unit's property's too; no app-wide policy anywhere.
  assert.deepEqual(policy('unit_vendors'), [
    [
      'AuthzEntityMembership',
      { entity_field: 'property_id', entity_type: 'properties', membership_type: 3 },
    ],
  ]);
  for (const table of tables.values())
    assert.ok(!table.policies.some((p) => p.$type === 'AuthzAppMembership'), table.table_name);
});

test("a link to a private row stays private when its other side is scoped, so the scope's members can't use it", () => {
  const next = structuredClone(spec);
  const backend = next.backend as CustomBackend;
  backend.entities.push({
    name: 'notes',
    access: 'private',
    fields: [{ name: 'body', type: 'text', required: true }],
  });
  const link: SpecLink = { between: ['notes', 'vendors'] };
  backend.links = [...(backend.links ?? []), link];
  const tables = tablesOf(next);
  assert.deepEqual(tables.get(linkTableName(link))?.policies, tables.get('notes')?.policies);
});

test('a scope access the database or the keys can’t back is refused, with what to do', () => {
  const orphan = structuredClone(spec);
  delete entity(orphan, 'leases').belongsTo;
  entity(orphan, 'vendors').access = { scope: 'teams' };
  const errors = scopeAccessErrors(specModel(orphan, {}, entityTables), tree);
  assert.deepEqual(
    errors.map((e) => e.path),
    ['backend.entities[0].access', 'backend.entities[2].access'],
  );
  assert.match(errors[0]!.message, /no "teams" scope/);
  assert.match(errors[1]!.message, /belongsTo to propertiess/);
  assert.deepEqual(scopeAccessErrors(specModel(spec, {}, entityTables), tree), []);
});

test("an entity type's table the spec declares keeps its labels and sample rows, so a rebuild can seed them again", () => {
  const declared: AppSpec = structuredClone(spec);
  const backend = declared.backend as CustomBackend;
  backend.entities.unshift({
    name: 'propertiess',
    label: 'Property',
    fields: [
      { name: 'name', type: 'text', required: true, label: 'Name' },
      { name: 'city', type: 'text', label: 'City' },
    ],
  });
  declared.seed = {
    propertiess: [{ name: 'Pier 9', city: 'Seattle' }],
    units: [{ unit_label: '1A', property_id: '@propertiess[0]' }],
    leases: [{ tenant_name: 'Ada Park', unit_id: '@units[0]' }],
  };
  const live = liveModelOf(declared, { scopes: tree });
  const record = builtRecord(declared, live);
  const view = liveSpec({
    model: live,
    overlay: record.overlay,
    seeded: record.seeded,
    fallbackName: 'x',
  });
  assert.deepEqual(entity(view.spec, 'propertiess'), entity(declared, 'propertiess'));
  assert.deepEqual(view.spec.seed, declared.seed);

  // A rebuild checks the file with the type's table recorded, not in the database.
  const schema = JSON.parse(
    readFileSync(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl), 'utf8'),
  );
  const recorded = new Map([['propertiess', new Set<string>()]]);
  const checked = validateAppSpec(view.spec, schema, { entityTables: recorded });
  assert.ok('spec' in checked, JSON.stringify('errors' in checked && checked.errors));
});

test("a first build seeds an entity type's own name without declaring it, and a wrong column lists it", () => {
  const schema = JSON.parse(
    readFileSync(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl), 'utf8'),
  );
  const schools: AppSpec = {
    version: 1,
    name: 'District',
    backend: {
      kind: 'custom',
      entities: [{ name: 'schools', fields: [{ name: 'city', type: 'text' }] }],
    },
    seed: { schools: [{ name: 'Lincoln High', city: 'Springfield' }] },
  };
  // As the database has the table manage_entity_types made, before the build adds city.
  const options = { entityTables: new Map([['schools', new Set(['id', 'name', 'owner_id'])]]) };
  const checked = validateAppSpec(schools, schema, options);
  assert.ok('spec' in checked, JSON.stringify('errors' in checked && checked.errors));

  const typo = validateAppSpec(
    { ...schools, seed: { schools: [{ title: 'Lincoln' }] } },
    schema,
    options,
  );
  assert.ok('errors' in typo);
  assert.deepEqual(
    typo.errors.map((e) => e.message),
    ['schools has no column "title"; its columns are "name", "city"'],
  );
});

test('the forms fill an organization from the active workspace and leave a copied entity to its trigger', () => {
  assert.deepEqual(accessFieldHints(specModel(spec, {}, entityTables), tree), {
    vendors: { entity_id: { hidden: true, default: '$scope:org' } },
    leases: { property_id: { hidden: true, required: false } },
  });
});

test('a table that exists takes a scope only when its key already names the entity', () => {
  const before: AppSpec = structuredClone(spec);
  for (const name of ['vendors', 'units', 'leases']) delete entity(before, name).access;
  const scopedUnits = structuredClone(before);
  entity(scopedUnits, 'units').access = { scope: 'properties' };
  const keyed = planDelta(before, scopedUnits, { scopes: tree, entityTables });
  if (keyed.ok === false) assert.fail(JSON.stringify(keyed.refused));
  assert.deepEqual(
    keyed.delta.destructive.map((change) => [change.kind, change.call]),
    [
      [
        'change_access',
        {
          tool: 'secure_table_provision',
          params: {
            table_name: 'units',
            owns: ['policies'],
            policies: [
              {
                $type: 'AuthzEntityMembership',
                data: {
                  entity_field: 'property_id',
                  entity_type: 'properties',
                  membership_type: 3,
                },
                privileges: ['select', 'insert', 'update', 'delete'],
                policy_role: 'authenticated',
                permissive: true,
              },
            ],
          },
        },
      ],
    ],
  );

  const scopedVendors = structuredClone(before);
  entity(scopedVendors, 'vendors').access = { scope: 'org' };
  const refused = planDelta(before, scopedVendors, { scopes: tree, entityTables });
  assert.equal(refused.ok, false);
  assert.match(
    refused.ok === false ? refused.refused[0]!.message : '',
    /needs entity_id on every row/,
  );
});

test("a curated entity type's table takes new columns under extend, and only them", () => {
  const schema = JSON.parse(
    readFileSync(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl), 'utf8'),
  );
  const rooms: AppSpec = {
    version: 1,
    name: 'Raise',
    backend: {
      kind: 'blueprint',
      slug: 'fundraise',
      extend: { fields: { data_rooms: [{ name: 'region', type: 'text' }] } },
    },
  };
  const checked = validateAppSpec(rooms, schema, {
    entityTables: new Map([['data_rooms', new Set(['id', 'name', 'owner_id'])]]),
  });
  assert.ok('spec' in checked, JSON.stringify('errors' in checked && checked.errors));
  const planned = planDelta(null, rooms, {
    entityTables: new Map([['data_rooms', new Set(['id', 'name', 'owner_id'])]]),
  });
  if (planned.ok === false) assert.fail(JSON.stringify(planned.refused));
  const call = planned.delta.calls.find((c) => c.tool === 'provision_blueprint');
  const { tables } = (call?.params as { definition: { tables: BlueprintTable[] } }).definition;
  assert.deepEqual(tables, [
    {
      table_name: 'data_rooms',
      nodes: [],
      fields: [{ name: 'region', type: 'text' }],
      policies: [],
    },
  ]);
});
