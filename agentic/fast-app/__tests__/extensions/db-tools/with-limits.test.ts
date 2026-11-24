import assert from 'node:assert/strict';

import { constructiveDbTools } from '@agentic-kit/pi';
import type { ExtensionAPI, ToolDefinition } from '@earendil-works/pi-coding-agent';

import {
  DATABASE_NAME_PATTERN,
  dbToolsWithLimits,
  executeProvision,
  withLimits,
} from '../../../src/extensions/db-tools/index-extension';
import { ABORT_MESSAGE, timeoutMessage } from '../../../src/extensions/db-tools/tool-limits';

type AnyTool = ToolDefinition;
type ExecuteArgs = Parameters<AnyTool['execute']>;

function fakeTool(name: string, execute: AnyTool['execute']): AnyTool {
  return {
    name,
    label: name,
    description: name,
    parameters: { type: 'object', properties: {} } as unknown as AnyTool['parameters'],
    execute,
  };
}

const run = (tool: AnyTool, signal?: AbortSignal) =>
  tool.execute('call-1', {}, signal, undefined, { cwd: '/tmp' } as ExecuteArgs[4]);

function registeredTools(): AnyTool[] {
  const tools: AnyTool[] = [];
  dbToolsWithLimits({
    registerTool: (tool: AnyTool) => tools.push(tool),
  } as unknown as ExtensionAPI);
  return tools;
}

test('the extension registers every db tool and the live schema tool', () => {
  assert.deepEqual(
    registeredTools().map((tool) => tool.name),
    [...constructiveDbTools.map((tool) => tool.name), 'describe_live_schema'],
  );
});

test('provision_database keeps the hostname-safe database name', () => {
  const provision = registeredTools().find((tool) => tool.name === 'provision_database');
  const properties = (provision?.parameters as { properties: Record<string, { pattern?: string }> })
    .properties;
  assert.equal(properties.database_name.pattern, DATABASE_NAME_PATTERN);
});

test('a wrapped tool that hangs rejects with the timeout text', async () => {
  const tool = withLimits(
    fakeTool('describe_schema', () => new Promise<never>(() => {})),
    10,
  );
  await assert.rejects(run(tool), { message: timeoutMessage(10) });
});

test('a wrapped tool ends at once when the turn signal aborts', async () => {
  const controller = new AbortController();
  const tool = withLimits(fakeTool('describe_schema', () => new Promise<never>(() => {})));
  const call = run(tool, controller.signal);
  controller.abort();
  await assert.rejects(call, { message: ABORT_MESSAGE });
});

test('a wrapped tool forwards its arguments and returns the result', async () => {
  let seen: ExecuteArgs | undefined;
  const result = { content: [{ type: 'text' as const, text: 'ok' }], details: {} };
  const tool = withLimits(
    fakeTool('describe_schema', async (...args) => {
      seen = args;
      return result;
    }),
  );
  assert.equal(await run(tool), result);
  assert.equal(seen?.[0], 'call-1');
  assert.equal(seen?.[4].cwd, '/tmp');
});

test('a failed provisioning result becomes a tool error with the backend details', async () => {
  const failed = {
    content: [] as never[],
    details: { success: false, message: 'REQUIRES (config_secrets_module:app)' },
  };
  const tool = withLimits(fakeTool('provision_database', async () => failed));
  await assert.rejects(run(tool), /REQUIRES \(config_secrets_module:app\)/);
  await assert.rejects(
    executeProvision(async () => failed),
    /REQUIRES/,
  );
});
