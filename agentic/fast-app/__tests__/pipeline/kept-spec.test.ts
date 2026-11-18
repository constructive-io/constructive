import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import type { DeltaOptions } from '../../src/app-spec/delta-types';
import type { AppSpec, CustomBackend, SpecField } from '../../src/app-spec/types';
import type { BlueprintJson } from '../../src/extensions/blueprint-summary';
import { resolvePlan } from '../../src/pipeline/build-plan';
import { followUpLines } from '../../src/pipeline/result-text';
import { deltaOf } from '../app-spec/__fixtures__/delta-of';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const read = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
const built: AppSpec = read(
  new URL('../app-spec/__fixtures__/food-bank.spec.json', moduleUrl),
);
const NONE = { blueprints: {} };

// A follow-up from `prev` to `spec`, resolved with the user's ticks.
function resolve(prev: AppSpec, spec: AppSpec, ticked: string[], options: DeltaOptions = NONE) {
  const delta = deltaOf(prev, spec, options);
  return { delta, ...resolvePlan({ spec, delta }, ticked) };
}

type Custom = AppSpec & { backend: CustomBackend };
function next(edit: (backend: CustomBackend) => void): Custom {
  const spec = structuredClone(built) as Custom;
  edit(spec.backend);
  return spec;
}
const fieldsOf = (spec: AppSpec, table: string) =>
  (spec as Custom).backend.entities.find((e) => e.name === table)?.fields.map((f) => f.name);
const uiOf = (spec: AppSpec) =>
  (spec.ui as { resources?: Record<string, Record<string, unknown>> } | undefined)?.resources;

const withoutVolunteerContact = next((backend) => {
  const volunteers = backend.entities.find((e) => e.name === 'volunteers');
  assert.ok(volunteers);
  volunteers.fields = volunteers.fields.filter((f) => f.name !== 'phone' && f.name !== 'email');
});

test('an unticked column drop goes back into its entity, hidden, unless new rows need it', () => {
  const resolved = resolve(built, withoutVolunteerContact, []);
  const kept = resolved.spec;

  assert.deepEqual(fieldsOf(kept, 'volunteers'), ['full_name', 'email', 'phone']);
  // email is required with no default: a form without it could never create a row.
  assert.deepEqual(uiOf(kept)?.volunteers, { fields: { phone: { hidden: true } } });
  // Spec and database agree again: nothing is left that only the database has.
  assert.deepEqual(resolved.left, []);
  const lines = followUpLines(resolved.delta, resolved).join('\n');
  assert.match(lines, /Kept and hid volunteers\.phone, because the user didn't tick the delete/);
  assert.match(lines, /Kept volunteers\.email, .* the screens still show it/);
  assert.equal(deltaOf(kept, kept, NONE).destructive.length, 0);
});

test('a ticked column drop leaves the spec without the column', () => {
  const kept = resolve(built, withoutVolunteerContact, [
    'drop_field:volunteers.phone',
    'drop_field:volunteers.email',
  ]).spec;
  assert.deepEqual(fieldsOf(kept, 'volunteers'), ['full_name']);
  assert.equal(uiOf(kept)?.volunteers, undefined);
});

test("an unticked drop of a curated table's column goes back into the extend, hidden", () => {
  const blueprints: Record<string, BlueprintJson> = {
    agent: read(new URL('../../src/blueprints/agent.json', moduleUrl)),
  };
  const priority: SpecField = { name: 'priority', type: 'text', enum: ['low', 'high'] };
  const agentApp = (extend: object): AppSpec => ({
    version: 1,
    name: 'Agent Review',
    backend: { kind: 'blueprint', slug: 'agent', extend },
  });
  const after = agentApp({});
  const resolved = resolve(agentApp({ fields: { agent_task: [priority] } }), after, [], {
    blueprints,
  });
  assert.deepEqual(
    resolved.delta.destructive.map((c) => c.id),
    ['drop_field:agent_task.priority'],
  );

  const kept = resolved.spec;
  assert.deepEqual(kept.backend, {
    kind: 'blueprint',
    slug: 'agent',
    extend: { fields: { agent_task: [priority] } },
  });
  assert.deepEqual(uiOf(kept)?.agent_task, { fields: { priority: { hidden: true } } });
});

test('an unticked table drop puts the entity back, off the sidebar', () => {
  const after = next((backend) => {
    backend.entities = backend.entities.filter((e) => e.name !== 'availability_notes');
  });
  const kept = resolve(built, after, []).spec;
  const notes = (built as Custom).backend.entities.find((e) => e.name === 'availability_notes');
  assert.deepEqual(
    (kept as Custom).backend.entities.find((e) => e.name === 'availability_notes'),
    notes,
  );
  assert.deepEqual(uiOf(kept)?.availability_notes, { hidden: true });
});
