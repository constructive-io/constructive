import assert from 'node:assert/strict';

import type { ExtensionAPI, ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { headlessExtensions, mapTools, toolNamesOf } from '../../src/headless/extensions';

type Registered = { name: string; execute: (...args: any[]) => Promise<any> };

function recordingPi() {
  const tools: Registered[] = [];
  const handlers: string[] = [];
  const pi = {
    registerTool: (tool: Registered): void => void tools.push(tool),
    on: (event: string): void => void handlers.push(event),
    appendEntry: () => {}
  } as unknown as ExtensionAPI;
  return { pi, tools, handlers };
}

test('the tool names are exactly what the extensions register, with no tool that makes a database or a key', async () => {
  const extensions = headlessExtensions();
  const names = await toolNamesOf(extensions);
  const { pi, tools, handlers } = recordingPi();
  for (const extension of extensions) await extension(pi);
  assert.deepEqual(names, tools.map((tool) => tool.name));
  for (const name of ['plan_app', 'verify_app', 'list_blueprints', 'describe_scopes', 'search_blocks', 'create_plan', 'describe_schema', 'add_records', 'run_codegen', 'describe_live_schema']) {
    assert.ok(names.includes(name), name);
  }
  assert.equal(names.includes('provision_database'), false);
  assert.equal(names.includes('create_api_key'), false);
  assert.equal(new Set(names).size, names.length);
  // The code rules guard every write.
  assert.ok(handlers.includes('tool_call'));
});

test('a left-out tool is never registered, and the others pass through as they are', async () => {
  const fake: ExtensionFactory = (pi) => {
    pi.registerTool({ name: 'keep', label: '', description: '', parameters: {} as never, execute: async () => ({ content: [], details: {} }) });
    pi.registerTool({ name: 'drop', label: '', description: '', parameters: {} as never, execute: async () => ({ content: [], details: {} }) });
    pi.on('tool_call', async () => undefined);
  };
  const { pi, tools, handlers } = recordingPi();
  await mapTools(fake, (tool) => (tool.name === 'drop' ? null : tool))(pi);
  assert.deepEqual(tools.map((tool) => tool.name), ['keep']);
  assert.deepEqual(handlers, ['tool_call']);
});
