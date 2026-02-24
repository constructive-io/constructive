import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { Type } from '@sinclair/typebox';

import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  ToolDefinition,
} from '@mariozechner/pi-coding-agent';

import {
  createConstructivePiExtension,
  type ConstructivePiOperation,
  type CreateConstructivePiExtensionOptions,
} from '../../src/extension-factory';

interface MockUI {
  confirm: jest.Mock<Promise<boolean>, [string, string]>;
  input: jest.Mock<Promise<string | undefined>, [string, string?]>;
  notify: jest.Mock<void, [string, ('info' | 'warning' | 'error')?]>;
}

interface MockSessionManager {
  getSessionId: jest.Mock<string, []>;
}

const createMockUI = (
  overrides: Partial<MockUI> = {},
): MockUI => {
  return {
    confirm: jest.fn().mockResolvedValue(true),
    input: jest.fn().mockResolvedValue(undefined),
    notify: jest.fn(),
    ...overrides,
  };
};

const createMockContext = (
  options: {
    hasUI?: boolean;
    ui?: MockUI;
    sessionId?: string;
    cwd?: string;
  } = {},
): ExtensionContext => {
  const ui = options.ui || createMockUI();
  const sessionManager: MockSessionManager = {
    getSessionId: jest.fn().mockReturnValue(options.sessionId || 'session-1'),
  };

  return {
    ui: ui as any,
    hasUI: options.hasUI !== false,
    cwd: options.cwd || process.cwd(),
    sessionManager: sessionManager as any,
    modelRegistry: {} as any,
    model: {
      provider: 'openai',
      id: 'gpt-4.1-mini',
    } as any,
    isIdle: () => true,
    abort: () => {},
    hasPendingMessages: () => false,
    shutdown: () => {},
    getContextUsage: () => undefined,
    compact: () => {},
    getSystemPrompt: () => 'test prompt',
  };
};

const createMockCommandContext = (
  options: {
    hasUI?: boolean;
    ui?: MockUI;
    sessionId?: string;
    cwd?: string;
  } = {},
): ExtensionCommandContext => {
  const base = createMockContext(options);

  return {
    ...base,
    waitForIdle: async () => {},
    newSession: async () => ({
      cancelled: false,
    }),
    fork: async () => ({
      cancelled: false,
    }),
    navigateTree: async () => ({
      cancelled: false,
    }),
    switchSession: async () => ({
      cancelled: false,
    }),
    reload: async () => {},
  };
};

const createMockApi = () => {
  const tools = new Map<string, ToolDefinition>();
  const commands = new Map<
    string,
    {
      description?: string;
      handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
    }
  >();

  const api = {
    registerTool: jest.fn((tool: ToolDefinition) => {
      tools.set(tool.name, tool);
    }),
    registerCommand: jest.fn(
      (
        name: string,
        options: {
          description?: string;
          handler: (
            args: string,
            ctx: ExtensionCommandContext,
          ) => Promise<void>;
        },
      ) => {
        commands.set(name, options);
      },
    ),
  } as unknown as ExtensionAPI;

  return {
    api,
    tools,
    commands,
  };
};

const createActiveCatalogFixture = (): {
  cwd: string;
  cleanup: () => void;
} => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'constructive-extension-test-'));
  const cacheRoot = path.join(cwd, '.constructive', 'agent');
  const ormIndexPath = path.join(cacheRoot, 'generated', 'orm', 'index.ts');
  const catalogPath = path.join(cacheRoot, 'generated', 'orm', 'agent-catalog.json');

  mkdirSync(path.dirname(ormIndexPath), {
    recursive: true,
  });

  writeFileSync(
    ormIndexPath,
    'export const noop = true;\n',
    'utf8',
  );

  writeFileSync(
    catalogPath,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        tools: [
          {
            name: 'orm_database_findMany',
            description: 'List database records',
            inputSchema: {
              type: 'object',
              properties: {
                first: {
                  type: 'integer',
                },
              },
            },
            _meta: {
              orm: {
                kind: 'model',
                method: 'findMany',
                model: 'database',
                hasArgs: true,
                argShape: 'modelFindMany',
                supportsSelect: true,
                defaultSelect: ['id'],
                scalarFields: ['id'],
                editableFields: ['name'],
              },
              policy: {
                capability: 'read',
                riskClass: 'read_only',
              },
            },
          },
        ],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  writeFileSync(
    path.join(cacheRoot, 'active-catalog.json'),
    `${JSON.stringify(
      {
        catalogId: 'fixture-catalog',
        cacheRoot,
        catalogPath,
        ormIndexPath,
        endpoint: 'https://api.example.com/graphql',
        updatedAt: Date.now(),
        toolCount: 1,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return {
    cwd,
    cleanup: () =>
      rmSync(cwd, {
        recursive: true,
        force: true,
      }),
  };
};

const makeReadOperation = (): ConstructivePiOperation => {
  return {
    toolName: 'get_project',
    label: 'Get Project',
    description: 'Reads a project by id',
    capability: 'read',
    riskClass: 'read_only',
    document: 'query GetProject($id: ID!) { project(id: $id) { id name } }',
    mapVariables: (args: Record<string, unknown>) => ({
      id: args.id,
    }),
    parameters: Type.Object({
      id: Type.String(),
    }),
  };
};

const makeWriteOperation = (): ConstructivePiOperation => {
  return {
    toolName: 'update_project',
    label: 'Update Project',
    description: 'Updates a project',
    capability: 'write',
    riskClass: 'low',
    document:
      'mutation UpdateProject($id: ID!) { updateProject(input: {id: $id}) { project { id } } }',
    mapVariables: (args: Record<string, unknown>) => ({
      id: args.id,
    }),
    parameters: Type.Object({
      id: Type.String(),
    }),
  };
};

const createExtensionOptions = (
  overrides: Partial<CreateConstructivePiExtensionOptions> = {},
): CreateConstructivePiExtensionOptions => {
  return {
    operations: [makeReadOperation()],
    includeHealthCheckTool: false,
    endpoint: 'https://api.example.com/graphql',
    accessToken: 'token-abc',
    legacyDocumentTools: true,
    ormDispatcher: {
      enabled: false,
    },
    ...overrides,
  };
};

describe('createConstructivePiExtension', () => {
  it('defaults to ORM dispatcher mode with explore commands', () => {
    const { api, tools, commands } = createMockApi();

    const extension = createConstructivePiExtension({
      operations: [makeReadOperation()],
      includeHealthCheckTool: false,
      endpoint: 'https://api.example.com/graphql',
      accessToken: 'token-abc',
    });

    extension(api);

    expect(tools.has('constructive_orm_call')).toBe(true);
    expect(tools.has('get_project')).toBe(false);
    expect(commands.has('constructive-explore')).toBe(true);
    expect(commands.has('constructive-capabilities')).toBe(true);
  });

  it('registers tools and default commands', () => {
    const { api, tools, commands } = createMockApi();

    const extension = createConstructivePiExtension(
      createExtensionOptions(),
    );

    extension(api);

    expect(tools.has('get_project')).toBe(true);
    expect(commands.has('constructive-status')).toBe(true);
    expect(commands.has('constructive-auth-status')).toBe(true);
    expect(commands.has('constructive-auth-set')).toBe(true);
  });

  it('returns guided suggestions for unknown ORM catalog tools', async () => {
    const fixture = createActiveCatalogFixture();
    const { api, tools } = createMockApi();
    const extension = createConstructivePiExtension({
      operations: [makeReadOperation()],
      includeHealthCheckTool: false,
      endpoint: 'https://api.example.com/graphql',
      accessToken: 'token-abc',
    });

    extension(api);

    const dispatcher = tools.get('constructive_orm_call');
    expect(dispatcher).toBeDefined();

    try {
      await dispatcher!.execute(
        'call-1',
        {
          tool: 'orm_tool_list',
          args: {},
        },
        undefined,
        undefined,
        createMockContext({
          cwd: fixture.cwd,
        }),
      );

      throw new Error('Expected dispatcher unknown-tool error');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('Unknown catalog tool "orm_tool_list".');
      expect(message).toContain('/constructive-capabilities --json');
      expect(message).toContain('Did you mean: orm_database_findMany');
    } finally {
      fixture.cleanup();
    }
  });

  it('executes read operation with mapped variables and headers', async () => {
    const execute = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        project: {
          id: 'p1',
          name: 'Alpha',
        },
      },
    });

    const { api, tools } = createMockApi();
    const extension = createConstructivePiExtension(
      createExtensionOptions({
        executor: {
          execute,
        },
        databaseId: 'db-1',
        apiName: 'main-api',
      }),
    );

    extension(api);

    const tool = tools.get('get_project');
    expect(tool).toBeDefined();

    const result = await tool!.execute(
      'call-1',
      {
        id: 'p1',
      },
      undefined,
      undefined,
      createMockContext(),
    );

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatchObject({
      endpoint: 'https://api.example.com/graphql',
      variables: {
        id: 'p1',
      },
      headers: {
        Authorization: 'Bearer token-abc',
        'X-Database-Id': 'db-1',
        'X-Api-Name': 'main-api',
      },
    });

    expect(result.content[0]?.type).toBe('text');
    expect((result.content[0] as { text?: string }).text).toContain('project');
  });

  it('blocks write operations when inline approval is rejected', async () => {
    const execute = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        updateProject: {
          project: {
            id: 'p1',
          },
        },
      },
    });

    const { api, tools } = createMockApi();
    const extension = createConstructivePiExtension({
      operations: [makeWriteOperation()],
      includeHealthCheckTool: false,
      endpoint: 'https://api.example.com/graphql',
      accessToken: 'token-abc',
      legacyDocumentTools: true,
      ormDispatcher: {
        enabled: false,
      },
      executor: {
        execute,
      },
    });

    extension(api);

    const ui = createMockUI({
      confirm: jest.fn().mockResolvedValue(false),
    });

    await expect(
      tools.get('update_project')!.execute(
        'call-1',
        {
          id: 'p1',
        },
        undefined,
        undefined,
        createMockContext({
          ui,
          hasUI: true,
        }),
      ),
    ).rejects.toThrow('Approval denied for update_project');

    expect(execute).not.toHaveBeenCalled();
    expect(ui.confirm).toHaveBeenCalledTimes(1);
  });

  it('allows write operations without UI when nonInteractiveApproval is allow', async () => {
    const execute = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        updateProject: {
          project: {
            id: 'p1',
          },
        },
      },
    });

    const { api, tools } = createMockApi();
    const extension = createConstructivePiExtension({
      operations: [makeWriteOperation()],
      includeHealthCheckTool: false,
      endpoint: 'https://api.example.com/graphql',
      accessToken: 'token-abc',
      legacyDocumentTools: true,
      ormDispatcher: {
        enabled: false,
      },
      nonInteractiveApproval: 'allow',
      executor: {
        execute,
      },
    });

    extension(api);

    await tools.get('update_project')!.execute(
      'call-1',
      {
        id: 'p1',
      },
      undefined,
      undefined,
      createMockContext({
        hasUI: false,
      }),
    );

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('stores session token through command and uses it for execution', async () => {
    const execute = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        project: {
          id: 'p1',
        },
      },
    });

    const { api, tools, commands } = createMockApi();
    const extension = createConstructivePiExtension({
      operations: [makeReadOperation()],
      includeHealthCheckTool: false,
      endpoint: 'https://api.example.com/graphql',
      legacyDocumentTools: true,
      ormDispatcher: {
        enabled: false,
      },
      executor: {
        execute,
      },
    });

    extension(api);

    const command = commands.get('constructive-auth-set');
    expect(command).toBeDefined();

    await command!.handler(
      'session-token-xyz',
      createMockCommandContext({
        sessionId: 'session-42',
      }),
    );

    await tools.get('get_project')!.execute(
      'call-1',
      {
        id: 'p1',
      },
      undefined,
      undefined,
      createMockContext({
        sessionId: 'session-42',
      }),
    );

    expect(execute.mock.calls[0][0].headers.Authorization).toBe(
      'Bearer session-token-xyz',
    );
  });

  it('applies custom policy engine decisions', async () => {
    const execute = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        project: {
          id: 'p1',
        },
      },
    });

    const { api, tools } = createMockApi();
    const extension = createConstructivePiExtension({
      operations: [makeReadOperation()],
      includeHealthCheckTool: false,
      endpoint: 'https://api.example.com/graphql',
      accessToken: 'token-abc',
      legacyDocumentTools: true,
      ormDispatcher: {
        enabled: false,
      },
      executor: {
        execute,
      },
      policyEngine: {
        evaluate: async () => ({
          action: 'deny',
          reason: 'Denied by test policy',
          riskClass: 'high',
        }),
      },
    });

    extension(api);

    await expect(
      tools.get('get_project')!.execute(
        'call-1',
        {
          id: 'p1',
        },
        undefined,
        undefined,
        createMockContext(),
      ),
    ).rejects.toThrow('Denied by test policy');

    expect(execute).not.toHaveBeenCalled();
  });
});
