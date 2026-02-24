import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { Type } from '@sinclair/typebox';

import {
  createConstructivePiExtension,
  type ConstructivePiOperation,
} from '../../src/extension-factory';

const dynamicImport = async <TModule>(
  specifier: string,
): Promise<TModule> => {
  const loader = Function(
    'modulePath',
    'return import(modulePath);',
  ) as (modulePath: string) => Promise<TModule>;
  return loader(specifier);
};

type SdkModule = {
  DefaultResourceLoader: new (options: Record<string, unknown>) => {
    reload(): Promise<void>;
  };
  SessionManager: {
    inMemory(): unknown;
  };
  createAgentSession(options: Record<string, unknown>): Promise<{
    session: {
      agent: {
        state: {
          tools: Array<{
            name: string;
            execute(
              toolCallId: string,
              input: Record<string, unknown>,
              signal?: AbortSignal,
              onUpdate?: (partial: unknown) => void,
            ): Promise<{ content: Array<{ type: string; text?: string }> }>;
          }>;
        };
      };
      dispose(): void;
    };
  }>;
};

type CapturedRequest = {
  method?: string;
  headers: IncomingMessage['headers'];
  body: string;
};

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
};

const writeJson = (
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
): void => {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
};

describe('PI SDK integration with constructive extension', () => {
  let server: http.Server | null = null;
  let endpoint = '';
  let requests: CapturedRequest[] = [];

  beforeEach(async () => {
    requests = [];

    server = http.createServer(async (req, res) => {
      if (req.url !== '/graphql' || req.method !== 'POST') {
        writeJson(res, 404, {
          error: 'not_found',
        });
        return;
      }

      const body = await readBody(req);
      requests.push({
        method: req.method,
        headers: req.headers,
        body,
      });

      writeJson(res, 200, {
        data: {
          project: {
            id: 'project-1',
            name: 'Project One',
          },
        },
      });
    });

    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    endpoint = `http://127.0.0.1:${address.port}/graphql`;
  });

  afterEach(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    server = null;
  });

  it('loads extension via DefaultResourceLoader and executes registered GraphQL tool', async () => {
    const sdk = await dynamicImport<SdkModule>('@mariozechner/pi-coding-agent');

    const operations: ConstructivePiOperation[] = [
      {
        toolName: 'get_project_by_id',
        label: 'Get Project By ID',
        description: 'Reads project by id',
        capability: 'read',
        riskClass: 'read_only',
        document:
          'query GetProject($id: ID!) { project(id: $id) { id name } }',
        mapVariables: (args: Record<string, unknown>) => ({
          id: args.id,
        }),
        parameters: Type.Object({
          id: Type.String(),
        }),
      },
    ];

    const extensionFactory = createConstructivePiExtension({
      operations,
      includeHealthCheckTool: false,
      endpoint,
      accessToken: 'token-sdk-e2e',
      actorId: 'actor-sdk',
      tenantId: 'tenant-sdk',
      databaseId: 'db-sdk',
      apiName: 'main-api',
      enableCommands: true,
      legacyDocumentTools: true,
      ormDispatcher: {
        enabled: false,
      },
    });

    const resourceLoader = new sdk.DefaultResourceLoader({
      cwd: process.cwd(),
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      extensionFactories: [extensionFactory],
    });

    await resourceLoader.reload();

    const { session } = await sdk.createAgentSession({
      resourceLoader,
      sessionManager: sdk.SessionManager.inMemory(),
      customTools: [],
    });

    try {
      const tool = session.agent.state.tools.find(
        (entry) => entry.name === 'get_project_by_id',
      );

      expect(tool).toBeDefined();

      const result = await tool!.execute(
        'tool-call-1',
        {
          id: 'project-1',
        },
        undefined,
      );

      expect(requests).toHaveLength(1);
      expect(requests[0].headers.authorization).toBe('Bearer token-sdk-e2e');
      expect(requests[0].headers['x-database-id']).toBe('db-sdk');
      expect(requests[0].headers['x-api-name']).toBe('main-api');

      const payload = JSON.parse(requests[0].body) as {
        query: string;
        variables: Record<string, unknown>;
      };

      expect(payload.query).toContain('query GetProject');
      expect(payload.variables).toEqual({
        id: 'project-1',
      });

      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Project One');
    } finally {
      session.dispose();
    }
  });
});
