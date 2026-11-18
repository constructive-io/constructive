import assert from 'node:assert/strict';

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

import { fastAppTools } from '../../src/tools';

function descriptionOf(name: string): string {
  const descriptions = new Map<string, string>();
  fastAppTools({
    registerTool: (tool: { name: string; description: string }) => descriptions.set(tool.name, tool.description),
    on: () => {}
  } as unknown as ExtensionAPI);
  const description = descriptions.get(name);
  assert.ok(description, `${name} is registered`);
  return description;
}

test("plan_app's description names nothing only the desktop has", () => {
  assert.doesNotMatch(descriptionOf('plan_app'), /password|the desktop|Preview/i);
});
