import assert from 'node:assert/strict';

import type { ExtensionAPI, ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { headlessExtensions, mapTools, toolNamesOf, withoutPreviewUrls } from '../../src/headless/extensions';
import { HEADLESS_SYSTEM_PROMPT } from '../../src/headless/index';

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

test('every tool the prompt section names is one the extensions register', async () => {
  const names = new Set(await toolNamesOf(headlessExtensions()));
  // Snake-case words written as code that are columns or values, not tools.
  const notTools = new Set(['created_at', 'entity_id', 'owner_id', 'set_null', 'shift_id', 'updated_at', 'volunteer_id', 'volunteer_shifts']);
  const named = [...HEADLESS_SYSTEM_PROMPT.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)]
    .map((match) => match[1])
    .filter((name) => !notTools.has(name));
  assert.ok(named.includes('plan_app'));
  assert.deepEqual(named.filter((name) => !names.has(name)), []);
  assert.match(HEADLESS_SYSTEM_PROMPT, /^## Building an app/);
});

test("a tool's result and updates leave out previewUrl, and keep the rest", async () => {
  const fake: ExtensionFactory = (pi) =>
    pi.registerTool({
      name: 'plan_app',
      label: 'Plan app',
      description: '',
      parameters: {} as never,
      execute: async (_id, _params, _signal, onUpdate) => {
        onUpdate?.({ content: [], details: { stage: 'building', previewUrl: 'http://localhost:4100' } });
        return { content: [{ type: 'text', text: 'Built.' }], details: { stage: 'done', previewUrl: 'http://localhost:4100' } };
      }
    });
  const { pi, tools } = recordingPi();
  await mapTools(fake, withoutPreviewUrls)(pi);
  const updates: unknown[] = [];
  const result = await tools[0].execute('call-1', {}, undefined, (partial: unknown) => updates.push(partial), {});
  assert.deepEqual(result, { content: [{ type: 'text', text: 'Built.' }], details: { stage: 'done' } });
  assert.deepEqual(updates, [{ content: [], details: { stage: 'building' } }]);
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
