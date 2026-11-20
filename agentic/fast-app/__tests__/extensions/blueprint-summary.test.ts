import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { type BlueprintJson, describeBlueprint } from '../../src/extensions/blueprint-summary';

// jest runs this file as CommonJS: its own URL, for the relative reads below.
const moduleUrl = pathToFileURL(__filename).href;

const blueprint = (slug: string): BlueprintJson =>
  JSON.parse(readFileSync(new URL(`../../src/blueprints/${slug}.json`, moduleUrl), 'utf8'));

test('a curated blueprint lists each table with the columns a seed row fills', () => {
  const text = describeBlueprint(blueprint('agent'));

  assert.match(text, /^## agent: /);
  assert.match(
    text,
    /\n- agent_thread: [^\n]+\n {2}title text, mode text \(default "ask"\), .*status text \(default "active"\)/,
  );
  // The parent key takes a reference; entity_id comes from the thread, so it is left out.
  assert.match(
    text,
    /\n- agent_message: [^\n]+\n {2}thread_id\* → agent_thread, author_role\* text, parts json/,
  );
  assert.doesNotMatch(text, /entity_id|owner_id/);
});

test('enum values, optional keys and module tables show as such', () => {
  const crm = describeBlueprint(blueprint('agentic_crm'));
  assert.match(
    crm,
    /stage one of lead\|contacted\|meeting\|diligence\|term_sheet\|committed\|closed\|passed \(default "lead"\)/,
  );
  assert.match(crm, /company_id → companies/);
  // Keys the blueprint declares only as relations list after the table's own fields.
  assert.match(
    crm,
    /\n- interactions: [^\n]+\n {2}type\* text, [^\n]*, contact_id\* → contacts, deal_id → deals\n/,
  );
  assert.match(
    crm,
    /\n- project_contacts: [^\n]+\n {2}[^\n]*project_id\* → projects, contact_id\* → contacts, company_id → companies, stage_id → project_stages$/m,
  );

  const room = describeBlueprint(blueprint('data_room'));
  assert.match(
    room,
    /- \(storage data_room files: module-managed tables; no screens or sample rows in the AppSpec\)/,
  );
});
