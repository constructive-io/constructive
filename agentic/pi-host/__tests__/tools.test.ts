import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { AgentTool } from '@agentic-kit/agent';
import type { ConfirmGate, GateHost } from '@agentic-kit/harness';

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

  it('leaves the coding tools ungated: a clone knows no db tool effect', async () => {
    const ran: string[] = [];
    const { tools } = createGatedToolset({
      tools: [tool('bash', ran), tool('edit_file', ran)],
      host: { ...host, confirmTool: async () => fail('a coding tool asked for approval') },
      cwd: '/w',
      deps: CLONE_GATE_DEPS
    });

    for (const t of tools) await t.execute('c1', {}, undefined);
    expect(ran).toEqual(['bash', 'edit_file']);
  });
});

describe('project context', () => {
  it('knows what is inside the work tree', () => {
    expect(isInside('/work/repo', '/work/repo/.constructive')).toBe(true);
    expect(isInside('/work/repo', '/work/repo')).toBe(true);
    expect(isInside('/work/repo', '/work/context')).toBe(false);
  });

  it('refuses to write a project binding inside the work tree', async () => {
    await expect(
      materializeProjectContext({
        dir: '/work/repo/.constructive',
        workTree: '/work/repo',
        databaseId: 'db'
      })
    ).rejects.toThrow(ProjectContextInsideWorkTreeError);
  });

  it('writes only the binding to a private .env beside the clone', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pi-host-'));
    const dir = await materializeProjectContext({
      dir: path.join(root, 'context'),
      workTree: path.join(root, 'repo'),
      databaseId: 'db-1',
      databaseName: 'app'
    });

    const env = await readFile(path.join(dir, '.env'), 'utf8');
    expect(env).toBe('DATABASE_ID=db-1\nDATABASE_NAME=app\n');
    expect((await stat(path.join(dir, '.env'))).mode & 0o777).toBe(0o600);
  });

  it('requires a database ID to write a project binding', async () => {
    await expect(
      materializeProjectContext({
        dir: '/tmp/ctx',
        workTree: '/tmp/repo',
        databaseId: ''
      })
    ).rejects.toThrow(/DATABASE_ID/);
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
