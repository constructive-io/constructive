import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { AgentTool } from '@agentic-kit/agent';
import type { ConfirmGate, GateHost } from '@agentic-kit/harness';
import { MUTATING_DB_TOOLS } from '@agentic-kit/harness';

import { createPiToolsHost } from '../src/host';
import {
  isInside,
  materializeProjectContext,
  ProjectContextInsideWorkTreeError
} from '../src/project-context';
import { CLONE_GATE_DEPS, createGatedToolset } from '../src/tools';

const tool = (name: string, ran: string[]): AgentTool => ({
  name,
  label: name,
  description: name,
  parameters: { type: 'object' },
  execute: async () => {
    ran.push(name);
    return { content: [{ type: 'text', text: 'done' }] };
  }
});

const host: GateHost = {
  hasUI: true,
  confirmTool: async () => true,
  notifyToolSkipped: () => undefined
};

describe('gated toolset', () => {
  it('runs the tool when the gate does not block', async () => {
    const ran: string[] = [];
    const gate: ConfirmGate = { onAgentStart: () => undefined, onToolCall: async () => undefined };
    const { tools } = createGatedToolset({ tools: [tool('edit_file', ran)], host, cwd: '/w', gate });

    await expect(tools[0].execute('c1', {}, undefined)).resolves.toMatchObject({
      content: [{ type: 'text', text: 'done' }]
    });
    expect(ran).toEqual(['edit_file']);
  });

  it('returns the gate\u2019s reason to the model instead of running the tool', async () => {
    const ran: string[] = [];
    const gate: ConfirmGate = {
      onAgentStart: () => undefined,
      onToolCall: async () => ({ block: true as const, reason: 'The user declined.' })
    };
    const { tools } = createGatedToolset({
      tools: [tool('apply_template', ran)],
      host,
      cwd: '/w',
      gate
    });

    await expect(tools[0].execute('c1', {}, undefined)).resolves.toEqual({
      content: [{ type: 'text', text: 'The user declined.' }]
    });
    expect(ran).toEqual([]);
  });

  it('passes the tool name and input the harness gate keys on', async () => {
    const seen: unknown[] = [];
    const gate: ConfirmGate = {
      onAgentStart: () => undefined,
      onToolCall: async (event) => {
        seen.push(event);
        return undefined;
      }
    };
    const { tools } = createGatedToolset({ tools: [tool('add_records', [])], host, cwd: '/w', gate });
    await tools[0].execute('c1', { table: 'users' }, undefined);
    expect(seen).toEqual([{ toolName: 'add_records', toolCallId: 'c1', input: { table: 'users' } }]);
  });

  it('leaves the coding tools ungated: the harness only gates mutating db tools', async () => {
    const ran: string[] = [];
    const { tools } = createGatedToolset({
      tools: [tool('bash', ran), tool('edit_file', ran)],
      host: { ...host, confirmTool: async () => fail('a coding tool asked for approval') },
      cwd: '/w',
      deps: CLONE_GATE_DEPS
    });

    for (const t of tools) await t.execute('c1', {}, undefined);
    expect(ran).toEqual(['bash', 'edit_file']);
    expect(MUTATING_DB_TOOLS.has('bash')).toBe(false);
  });
});

describe('project context', () => {
  it('knows what is inside the work tree', () => {
    expect(isInside('/work/repo', '/work/repo/.constructive')).toBe(true);
    expect(isInside('/work/repo', '/work/repo')).toBe(true);
    expect(isInside('/work/repo', '/work/context')).toBe(false);
  });

  it('refuses to write credentials anywhere a commit could publish them', async () => {
    await expect(
      materializeProjectContext({
        dir: '/work/repo/.constructive',
        workTree: '/work/repo',
        databaseId: 'db',
        accessToken: 'token'
      })
    ).rejects.toThrow(ProjectContextInsideWorkTreeError);
  });

  it('writes a private .env beside the clone', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pi-host-'));
    const dir = await materializeProjectContext({
      dir: path.join(root, 'context'),
      workTree: path.join(root, 'repo'),
      databaseId: 'db-1',
      accessToken: 'token-1',
      databaseName: 'app'
    });

    const env = await readFile(path.join(dir, '.env'), 'utf8');
    expect(env).toBe('DATABASE_ID=db-1\nACCESS_TOKEN=token-1\nDATABASE_NAME=app\n');
    expect((await stat(path.join(dir, '.env'))).mode & 0o777).toBe(0o600);
  });

  it('will not pretend to have a context without credentials', async () => {
    await expect(
      materializeProjectContext({
        dir: '/tmp/ctx',
        workTree: '/tmp/repo',
        databaseId: '',
        accessToken: 'token'
      })
    ).rejects.toThrow(/DATABASE_ID and ACCESS_TOKEN/);
  });
});

describe('pi tools host', () => {
  it('is built from values, and offers only what a Job can honestly offer', () => {
    const piHost = createPiToolsHost({
      userId: 'user-1',
      accessToken: 'token-1',
      apiEndpoint: 'https://api.example.test/graphql'
    });
    expect(piHost.account()).toEqual({ userId: 'user-1', accessToken: 'token-1' });
    expect(piHost.backendConfig()).toEqual({ apiEndpoint: 'https://api.example.test/graphql' });
    expect(piHost.previewToken).toBeUndefined();
    expect(piHost.deliverSecret).toBeUndefined();
  });

  it('refuses to exist without a token', () => {
    expect(() => createPiToolsHost({ userId: 'u', accessToken: '' })).toThrow(/access token/);
  });
});
