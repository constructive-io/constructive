// plan_app's description is what the agent reads in every host: the desktop's
// card and a cloud Job's card. It names no password, no desktop and no
// Preview, which only the desktop has.

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

test("plan_app's description reads the same for every host", () => {
  const description = descriptionOf('plan_app');
  assert.match(
    description,
    /^Build a working CRUD app from an AppSpec in one call: the user approves one card, then the build provisions the database, builds the schema \(a curated blueprint or your custom entities\), generates the SDK, seeds the rows, generates every screen, starts the dev server, verifies \(types, every route, create\/edit\/delete on every table\) and commits\./
  );
  assert.doesNotMatch(description, /password|the desktop|Preview/i);
});
