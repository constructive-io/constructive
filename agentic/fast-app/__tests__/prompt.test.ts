import assert from 'node:assert/strict';

import type { ExtensionAPI, ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { blocksTools } from '../src/extensions/blocks-tools';
import { blueprintTools } from '../src/extensions/blueprint-tools';
import { dbToolsWithLimits } from '../src/extensions/db-tools/index-extension';
import { planTools } from '../src/extensions/plan-tools';
import { scopeTools } from '../src/extensions/scope-tools';
import { appBuildingSection, specToolsNote } from '../src/prompt';
import { fastAppTools } from '../src/tools';

const EXTENSIONS: ExtensionFactory[] = [
  fastAppTools,
  blueprintTools,
  scopeTools,
  blocksTools,
  planTools,
  dbToolsWithLimits
];

function registeredTools(): Set<string> {
  const names = new Set<string>();
  const pi = {
    registerTool: (tool: { name: string }) => names.add(tool.name),
    on: () => {}
  } as unknown as ExtensionAPI;
  for (const extension of EXTENSIONS) extension(pi);
  return names;
}

// Names in code that are columns, keys or values of the examples, not tools.
const NOT_TOOLS = new Set([
  'created_at',
  'entity_id',
  'owner_id',
  'set_null',
  'shift_id',
  'updated_at',
  'volunteer_id',
  'volunteer_shifts'
]);

/** The snake_case words the text writes as code, such as `plan_app`. */
const codeNames = (text: string) => [...text.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)].map((m) => m[1]);

test('every tool the app-building sections name is registered by the extensions', () => {
  const tools = registeredTools();
  const named = new Set(
    [appBuildingSection(true), specToolsNote()].flatMap(codeNames).filter((name) => !NOT_TOOLS.has(name))
  );
  assert.ok(named.has('plan_app') && named.has('verify_app'));
  assert.deepEqual(
    [...named].filter((name) => !tools.has(name)),
    []
  );
});
