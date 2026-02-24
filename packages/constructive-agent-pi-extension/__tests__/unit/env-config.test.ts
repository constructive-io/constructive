import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createConstructivePiOptionsFromEnv,
  loadConstructiveOperationsFromFile,
} from '../../src/env-config';

describe('env-config', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'constructive-pi-ext-'));

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads operations from JSON file', () => {
    const file = join(tempDir, 'operations.json');
    writeFileSync(
      file,
      JSON.stringify([
        {
          toolName: 'create_project',
          label: 'Create Project',
          description: 'Creates project',
          capability: 'write',
          riskClass: 'low',
          document:
            'mutation CreateProject($name: String!) { createProject(input: {name: $name}) { project { id } } }',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            required: ['name'],
          },
        },
      ]),
      'utf8',
    );

    const operations = loadConstructiveOperationsFromFile(file);

    expect(operations).toHaveLength(1);
    expect(operations[0].toolName).toBe('create_project');
    expect(operations[0].capability).toBe('write');
  });

  it('throws for invalid operation capabilities', () => {
    const file = join(tempDir, 'invalid-operations.json');
    writeFileSync(
      file,
      JSON.stringify([
        {
          toolName: 'bad_tool',
          capability: 'invalid',
          riskClass: 'low',
          document: 'query { __typename }',
        },
      ]),
      'utf8',
    );

    expect(() => loadConstructiveOperationsFromFile(file)).toThrow(
      'Invalid capability',
    );
  });

  it('builds extension options from env', () => {
    const options = createConstructivePiOptionsFromEnv({
      CONSTRUCTIVE_GRAPHQL_ENDPOINT: 'https://api.example.com/graphql',
      CONSTRUCTIVE_ACCESS_TOKEN: 'token-abc',
      CONSTRUCTIVE_ACTOR_ID: 'actor-123',
      CONSTRUCTIVE_TENANT_ID: 'tenant-1',
      CONSTRUCTIVE_NON_INTERACTIVE_APPROVAL: 'allow',
      CONSTRUCTIVE_ENABLE_COMMANDS: 'false',
      CONSTRUCTIVE_INCLUDE_HEALTH_CHECK: 'false',
      CONSTRUCTIVE_COMMAND_PREFIX: 'cnc',
    });

    expect(options.endpoint).toBe('https://api.example.com/graphql');
    expect(options.accessToken).toBe('token-abc');
    expect(options.actorId).toBe('actor-123');
    expect(options.tenantId).toBe('tenant-1');
    expect(options.nonInteractiveApproval).toBe('allow');
    expect(options.enableCommands).toBe(false);
    expect(options.includeHealthCheckTool).toBe(false);
    expect(options.commandPrefix).toBe('cnc');
  });
});
