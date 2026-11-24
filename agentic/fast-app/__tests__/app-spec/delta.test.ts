import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { type DeltaCall, planDelta } from '../../src/app-spec/delta';
import { seedPlan } from '../../src/app-spec/seed-plan';
import type { AppSpec, CustomBackend, LiveSchema, SpecField } from '../../src/app-spec/types';
import { validateAppSpec } from '../../src/app-spec/validate';
import { deltaOf } from './__fixtures__/delta-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const schema = read(new URL('../../src/app-spec/contract/app-spec.schema.json', moduleUrl));
const built: AppSpec = read(new URL('./__fixtures__/food-bank.spec.json', moduleUrl));

// The next spec: the built one, changed by `edit`, and valid, so the delta is
// never tested on a spec plan_app would reject before it.
function next(edit: (spec: AppSpec & { backend: CustomBackend }) => void): AppSpec {
  const spec = structuredClone(built) as AppSpec & { backend: CustomBackend };
  edit(spec);
  const result = validateAppSpec(spec, schema, { blueprints: {} });
  assert.deepEqual('errors' in result ? result.errors : [], []);
  return spec;
}

const entity = (spec: AppSpec & { backend: CustomBackend }, name: string) => {
  const found = spec.backend.entities.find((e) => e.name === name);
  assert.ok(found, name);
  return found;
};

// The database as the built spec left it, plus columns made outside plan_app.
function builtDatabase(extra: Record<string, string[]> = {}): LiveSchema {
  const system = ['id', 'owner_id', 'created_at', 'updated_at'];
  const backend = built.backend as CustomBackend;
  const live = new Map(
    backend.entities.map((e): [string, Set<string>] => [
      e.name,
      new Set([
        ...system,
        ...e.fields.map((f) => f.name),
        ...(e.belongsTo ?? []).map((k) => k.field),
      ]),
    ]),
  );
  live.set('volunteer_shifts', new Set([...system, 'volunteer_id', 'shift_id']));
  for (const [table, columns] of Object.entries(extra))
    for (const c of columns) live.get(table)?.add(c);
  return live;
}

const tools = (calls: DeltaCall[]) =>
  calls.map((c) =>
    c.tool === 'provision_blueprint'
      ? `provision_blueprint ${c.params.definition.tables.map((t) => t.table_name).join(',')} | ${(c.params.definition.relations ?? []).map((r) => `${r.source_table}.${r.field_name}`).join(',')}`
      : `${c.tool} ${c.params.table_name}${'field_name' in c.params ? `.${c.params.field_name}` : ''}`,
  );

test('a follow-up that adds runs only additions, with one construct of only the new tables', () => {
  const spec = next((s) => {
    entity(s, 'locations').fields.push({ name: 'opens_at', type: 'text' });
    entity(s, 'volunteers').fields.push({
      name: 'skill',
      type: 'text',
      enum: ['driver', 'packer'],
      default: 'packer',
    });
    entity(s, 'shifts').belongsTo?.push({
      field: 'lead_id',
      to: 'volunteers',
      onDelete: 'set_null',
    });
    s.backend.entities.push({
      name: 'donations',
      fields: [{ name: 'item', type: 'text', required: true }],
      belongsTo: [{ field: 'location_id', to: 'locations', onDelete: 'cascade' }],
    });
    s.backend.links?.push({ between: ['donations', 'volunteers'] });
  });
  const delta = deltaOf(built, spec, { blueprints: {} });

  assert.deepEqual(delta.destructive, []);
  assert.deepEqual(tools(delta.calls), [
    'create_field locations.opens_at',
    'secure_table_provision volunteers',
    // B2: an existing table never goes into a construct; a new key from one does.
    'provision_blueprint donations,donation_volunteers | shifts.lead_id,donations.location_id,donation_volunteers.donation_id,donation_volunteers.volunteer_id',
  ]);
  const [create, status, construct] = delta.calls;
  assert.deepEqual(create.params, {
    table_name: 'locations',
    field_name: 'opens_at',
    type: 'text',
  });
  assert.equal(status.tool, 'secure_table_provision');
  assert.deepEqual(status.tool === 'secure_table_provision' && status.params.nodes, [
    {
      $type: 'DataStatusField',
      data: {
        field_name: 'skill',
        allowed_values: ['driver', 'packer'],
        is_required: false,
        default_value: { value: 'packer' },
      },
    },
  ]);
  const lead =
    construct.tool === 'provision_blueprint' &&
    construct.params.definition.relations?.find((r) => r.field_name === 'lead_id');
  assert.equal(lead && lead.is_required, false);
  assert.deepEqual(
    delta.additions.map((a) => a.id),
    [
      'add_field:locations.opens_at',
      'add_field:volunteers.skill',
      'add_key:shifts.lead_id',
      'add_table:donations',
      'add_link:donation_volunteers',
    ],
  );
  assert.equal(delta.uiOnly, false);
});

test('a new column or key on a table with rows must be optional or have a default', () => {
  // The seed rows fill the new columns, but the rows already in the database can't.
  const spec = next((s) => {
    entity(s, 'locations').fields.push({ name: 'region', type: 'text', required: true });
    entity(s, 'volunteers').belongsTo = [{ field: 'home_id', to: 'locations' }];
    s.seed!.locations = s.seed!.locations.map((row) => ({ ...row, region: 'north' }));
    s.seed!.volunteers = s.seed!.volunteers.map((row) => ({ ...row, home_id: '@locations[0]' }));
  });
  const plan = planDelta(built, spec, { blueprints: {} });
  if (plan.ok !== false) assert.fail('expected a refusal');
  assert.deepEqual(
    plan.refused.map((e) => e.path),
    ['backend.entities[0].fields[3]', 'backend.entities[1].belongsTo[0]'],
  );
  assert.match(plan.refused[1].message, /onDelete "set_null"/);
});

test('a plan with a refusal carries none of its calls, and a runnable one carries them', () => {
  const opensAt: SpecField = { name: 'opens_at', type: 'text' };
  const mixed = next((s) => {
    entity(s, 'locations').fields.push(opensAt, { name: 'region', type: 'text', required: true });
    s.seed!.locations = s.seed!.locations.map((row) => ({ ...row, region: 'north' }));
  });
  const refused = planDelta(built, mixed, { blueprints: {} });
  assert.deepEqual(refused, {
    ok: false,
    refused: [
      {
        path: 'backend.entities[0].fields[4]',
        message: 'locations has rows already, so a new column must be optional or have a default',
      },
    ],
    warnings: [],
  });

  const runnable = planDelta(
    built,
    next((s) => entity(s, 'locations').fields.push(opensAt)),
    { blueprints: {} },
  );
  if (!runnable.ok) assert.fail('expected a runnable plan');
  assert.deepEqual(tools(runnable.delta.calls), ['create_field locations.opens_at']);
});

test('removals and risky changes wait for a tick, in a safe order, with what each loses', () => {
  const spec = next((s) => {
    s.backend.entities = s.backend.entities.filter((e) => e.name !== 'locations');
    delete entity(s, 'shifts').belongsTo;
    entity(s, 'shifts').fields.find((f) => f.name === 'status')!.enum = ['open', 'cancelled'];
    entity(s, 'volunteers').fields = entity(s, 'volunteers').fields.filter(
      (f) => f.name !== 'phone',
    );
    entity(s, 'availability_notes').access = 'shared';
    s.seed = { volunteers: s.seed!.volunteers.map(({ phone: _, ...row }) => row) };
  });
  const delta = deltaOf(built, spec, { blueprints: {}, rows: { locations: 12 } });

  assert.deepEqual(delta.calls, []);
  assert.deepEqual(
    delta.destructive.map((d) => [d.id, d.call.tool]),
    [
      ['change_access:availability_notes', 'secure_table_provision'],
      ['narrow_enum:shifts.status', 'secure_table_provision'],
      ['drop_key:shifts.location_id', 'delete_field'],
      ['drop_field:volunteers.phone', 'delete_field'],
      ['drop_table:locations', 'delete_table'],
    ],
  );
  const byId = new Map(delta.destructive.map((d) => [d.id, d]));
  assert.equal(
    byId.get('drop_table:locations')?.loses,
    'the 12 rows in locations, for good. Leave it unticked to keep the data and hide the table',
  );
  assert.deepEqual(byId.get('drop_table:locations')?.requires, ['drop_key:shifts.location_id']);
  assert.match(byId.get('change_access:availability_notes')?.loses ?? '', /every member can read/);
  const access = byId.get('change_access:availability_notes')?.call;
  assert.deepEqual(access?.tool === 'secure_table_provision' && access.params.owns, ['policies']);
  assert.match(byId.get('narrow_enum:shifts.status')?.title ?? '', /"full"/);
});

test('one column out and one of the same kind in is offered as a rename, with an add as fallback', () => {
  const spec = next((s) => {
    entity(s, 'volunteers').fields.find((f) => f.name === 'phone')!.name = 'mobile';
    s.seed!.volunteers = s.seed!.volunteers.map(({ phone, ...row }) =>
      phone === undefined ? row : { ...row, mobile: phone },
    );
  });
  const delta = deltaOf(built, spec, { blueprints: {} });
  assert.deepEqual(delta.additions, []);
  assert.deepEqual(delta.calls, []);
  assert.equal(delta.destructive.length, 1);
  const [rename] = delta.destructive;
  assert.equal(rename.kind, 'rename_field');
  assert.deepEqual(rename.call.params, {
    table_name: 'volunteers',
    field_name: 'phone',
    new_name: 'mobile',
  });
  assert.deepEqual(rename.fallback, {
    tool: 'create_field',
    params: { table_name: 'volunteers', field_name: 'mobile', type: 'text' },
  });
});

test('against the live schema, a repeat after a half-applied build does only what is missing', () => {
  const spec = next((s) => {
    entity(s, 'locations').fields.push({ name: 'opens_at', type: 'text' });
    entity(s, 'locations').fields.push({ name: 'closes_at', type: 'text' });
    s.backend.entities.push({ name: 'donations', fields: [{ name: 'item', type: 'text' }] });
    entity(s, 'volunteers').fields = entity(s, 'volunteers').fields.filter(
      (f) => f.name !== 'phone',
    );
    s.seed!.volunteers = s.seed!.volunteers.map(({ phone: _, ...row }) => row);
  });
  const columns = (...names: string[]) =>
    new Set(['id', 'owner_id', 'created_at', 'updated_at', ...names]);
  const live: LiveSchema = new Map([
    // opens_at and donations landed before the build stopped; phone was deleted by hand.
    ['locations', columns('name', 'address', 'capacity', 'opens_at')],
    ['volunteers', columns('full_name', 'email')],
    ['shifts', columns('starts_at', 'ends_at', 'status', 'notes', 'location_id')],
    ['availability_notes', columns('note', 'week_of', 'volunteer_id')],
    ['volunteer_shifts', columns('volunteer_id', 'shift_id')],
    ['donations', columns('item')],
  ]);
  const delta = deltaOf(built, spec, { blueprints: {}, live });
  assert.deepEqual(tools(delta.calls), ['create_field locations.closes_at']);
  assert.deepEqual(delta.destructive, []);
});

test('a column made outside plan_app that the spec now gives fixed values gets its check on a tick', () => {
  // The agent added volunteers.level with create_field; the spec now lists it with enum.
  const spec = next((s) => {
    entity(s, 'volunteers').fields.push({ name: 'level', type: 'text', enum: ['new', 'lead'] });
  });
  const live = builtDatabase({ volunteers: ['level'] });
  const delta = deltaOf(built, spec, { blueprints: {}, live });
  assert.deepEqual(delta.calls, []);
  assert.deepEqual(
    delta.destructive.map((d) => [d.id, d.title]),
    [['restrict_values:volunteers.level', 'Limit volunteers.level to "new", "lead"']],
  );
});

test('a wider enum and a relaxed field are additions; a ui-only change has nothing to run', () => {
  const widened = next((s) => {
    entity(s, 'shifts')
      .fields.find((f) => f.name === 'status')!
      .enum!.push('tentative');
    entity(s, 'volunteers').fields.find((f) => f.name === 'email')!.required = false;
  });
  const delta = deltaOf(built, widened, { blueprints: {} });
  assert.deepEqual(delta.destructive, []);
  assert.deepEqual(tools(delta.calls), [
    'update_field volunteers.email',
    'secure_table_provision shifts',
  ]);
  assert.deepEqual(
    delta.additions.map((a) => a.title),
    ['Make volunteers.email optional', 'Allow "tentative" in shifts.status'],
  );

  const relabeled = next((s) => {
    entity(s, 'locations').label = 'Sites';
  });
  assert.equal(deltaOf(built, relabeled, { blueprints: {} }).uiOnly, true);
});

test('only appended seed rows are new, and they keep their indexes for references', () => {
  const spec = next((s) => {
    s.seed!.volunteers.push({ full_name: 'Bo Chen', email: 'bo@example.com' });
    s.seed!.volunteer_shifts.push({ volunteers: '@volunteers[2]', shifts: '@shifts[0]' });
    s.seed!.locations[0] = { ...s.seed!.locations[0], name: 'Renamed' };
  });
  const delta = deltaOf(built, spec, { blueprints: {} });
  assert.deepEqual(delta.seed.kept, ['locations']);
  assert.equal(delta.seed.rows, 2);
  assert.equal(delta.uiOnly, false);

  const steps = seedPlan(spec, undefined, { from: delta.seed.from }).filter((s) => s.rows.length);
  assert.deepEqual(
    steps.map((s) => [s.table, s.from, s.rows]),
    [
      ['volunteers', 2, [{ full_name: 'Bo Chen', email: 'bo@example.com' }]],
      ['volunteer_shifts', 2, [{ volunteer_id: '@volunteers[2]', shift_id: '@shifts[0]' }]],
    ],
  );
});

test('a spec for another backend is refused before the card', () => {
  const blueprint: AppSpec = {
    version: 1,
    name: 'Food Bank',
    backend: { kind: 'blueprint', slug: 'agent' },
  };
  const plan = planDelta(built, blueprint, { blueprints: {} });
  if (plan.ok !== false) assert.fail('expected a refusal');
  assert.equal(plan.refused.length, 1);
  assert.match(plan.refused[0].message, /new project/);
});
