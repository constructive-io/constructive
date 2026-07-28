import { z } from 'zod';

import dbTools, { configureHost, createDbTools, getHost, toolSchema } from '../src';

describe('host configuration', () => {
  it('getHost throws before configureHost', () => {
    expect(() => getHost()).toThrow(/host not configured/i);
  });

  it('configureHost + getHost round-trips', () => {
    const host = {
      account: () => ({ userId: 'u1', accessToken: 't1' }),
      backendConfig: () => ({ apiEndpoint: 'http://api.localhost:3000/graphql' }),
    };
    configureHost(host);
    expect(getHost()).toBe(host);
    expect(getHost().account()?.userId).toBe('u1');
  });

  it('createDbTools configures the host and returns the extension', () => {
    const host = {
      account: (): null => null,
      backendConfig: (): null => null,
    };
    expect(createDbTools(host)).toBe(dbTools);
    expect(getHost()).toBe(host);
  });
});

describe('toolSchema', () => {
  it('emits plain JSON Schema without a $schema marker', () => {
    const schema = toolSchema(
      z.object({
        table_name: z.string().describe('Table name'),
        rows: z.array(z.record(z.string(), z.unknown())).optional(),
      }),
    ) as unknown as Record<string, unknown>;

    expect(schema.$schema).toBeUndefined();
    expect(schema.type).toBe('object');
    const props = schema.properties as Record<string, Record<string, unknown>>;
    expect(props.table_name).toMatchObject({ type: 'string', description: 'Table name' });
    expect(schema.required).toEqual(['table_name']);
  });
});

describe('dbTools extension', () => {
  it('registers the 16 tools and both gate events', () => {
    const registered: string[] = [];
    const events: string[] = [];
    const fakePi = {
      registerTool: (tool: { name: string }) => registered.push(tool.name),
      on: (event: string) => events.push(event),
    };
    (dbTools as (pi: unknown) => void)(fakePi);

    expect(registered).toHaveLength(16);
    expect(registered).toEqual(
      expect.arrayContaining([
        'provision_database',
        'provision_blueprint',
        'describe_schema',
        'add_relation',
        'delete_table',
        'create_field',
        'update_field',
        'delete_field',
        'add_policies',
        'add_records',
        'run_codegen',
        'list_templates',
        'create_template',
        'apply_template',
        'update_template',
        'delete_template',
      ]),
    );
    expect(events).toEqual(['agent_start', 'tool_call']);
  });
});
