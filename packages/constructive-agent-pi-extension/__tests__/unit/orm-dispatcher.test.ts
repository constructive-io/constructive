import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { OrmCatalogTool } from '../../src/orm-catalog';
import {
  executeOrmDispatcherCall,
  normalizeOrmToolArgs,
  validateOrmToolInput,
} from '../../src/orm-dispatcher';

const createTool = (
  partial: Partial<OrmCatalogTool> & Pick<OrmCatalogTool, 'name'>,
): OrmCatalogTool => {
  return {
    name: partial.name,
    description: partial.description || partial.name,
    inputSchema: partial.inputSchema || {
      type: 'object',
      properties: {},
    },
    _meta: partial._meta || {
      orm: {
        kind: 'model',
        method: 'findMany',
        model: 'database',
        pkField: 'id',
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
  };
};

const createFixtureModule = (): {
  root: string;
  ormIndexPath: string;
} => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'constructive-orm-dispatcher-'));
  const ormDir = path.join(root, 'generated', 'orm');
  mkdirSync(ormDir, {
    recursive: true,
  });

  const ormIndexPath = path.join(ormDir, 'index.mjs');
  writeFileSync(
    ormIndexPath,
    [
      'export function createClient(config) {',
      '  return {',
      '    database: {',
      "      client: { label: 'model-client' },",
      '      findMany(args) {',
      '        return {',
      '          execute: async () => ({',
      '            ok: true,',
      '            data: {',
      '              label: this.client?.label,',
      '              endpoint: config.endpoint,',
      '              args,',
      '            },',
      '          }),',
      '        };',
      '      },',
      '    },',
      '    query: {',
      "      client: { label: 'query-client' },",
      '      ping(args, options) {',
      '        return {',
      '          execute: async () => ({',
      '            ok: true,',
      '            data: {',
      '              label: this.client?.label,',
      '              endpoint: config.endpoint,',
      '              args,',
      '              options,',
      '            },',
      '          }),',
      '        };',
      '      },',
      '    },',
      '  };',
      '}',
      '',
    ].join('\n'),
    'utf8',
  );

  return {
    root,
    ormIndexPath,
  };
};

describe('orm-dispatcher', () => {
  it('normalizes findMany aliases to first/offset', () => {
    const tool = createTool({
      name: 'orm_database_findMany',
    });

    const normalized = normalizeOrmToolArgs(tool, {
      take: 5,
      skip: 2,
    });

    expect(normalized).toEqual({
      first: 5,
      offset: 2,
    });
  });

  it('uses permissive validation mode for create tools', () => {
    const tool = createTool({
      name: 'orm_database_create',
      inputSchema: {
        type: 'object',
        properties: {
          ownerId: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['ownerId', 'name'],
      },
      _meta: {
        orm: {
          kind: 'model',
          method: 'create',
          model: 'database',
          pkField: 'id',
          hasArgs: true,
          argShape: 'modelCreateFlat',
          supportsSelect: true,
          defaultSelect: ['id'],
          scalarFields: ['id'],
          editableFields: ['ownerId', 'name'],
        },
        policy: {
          capability: 'write',
          riskClass: 'low',
        },
      },
    });

    expect(validateOrmToolInput(tool, {})).toEqual([]);
    expect(validateOrmToolInput(tool, {}, { mode: 'strict' })).toEqual([
      'args.ownerId is required',
      'args.name is required',
    ]);
  });

  it('binds model method receiver during execution', async () => {
    const fixture = createFixtureModule();
    const tool = createTool({
      name: 'orm_database_findMany',
    });

    try {
      const result = await executeOrmDispatcherCall({
        ormIndexPath: fixture.ormIndexPath,
        endpoint: 'http://api.localhost:3000/graphql',
        headers: {
          Authorization: 'Bearer test-token',
        },
        tool,
        args: {
          take: 1,
          skip: 0,
        },
        selectPolicy: 'auto-minimal',
      });

      expect(result.data).toMatchObject({
        label: 'model-client',
        endpoint: 'http://api.localhost:3000/graphql',
        args: {
          first: 1,
          offset: 0,
          select: {
            id: true,
          },
        },
      });

      expect(result.invocation.args).toEqual({
        first: 1,
        offset: 0,
        select: {
          id: true,
        },
      });
    } finally {
      rmSync(fixture.root, {
        recursive: true,
        force: true,
      });
    }
  });

  it('binds custom accessor receiver during execution', async () => {
    const fixture = createFixtureModule();
    const tool = createTool({
      name: 'orm_query_ping',
      _meta: {
        orm: {
          kind: 'custom',
          method: 'query',
          accessor: 'query',
          operationName: 'ping',
          hasArgs: true,
          argShape: 'customOperation',
          supportsSelect: true,
          defaultSelect: ['__typename'],
          scalarFields: [],
          editableFields: [],
        },
        policy: {
          capability: 'read',
          riskClass: 'read_only',
        },
      },
    });

    try {
      const result = await executeOrmDispatcherCall({
        ormIndexPath: fixture.ormIndexPath,
        endpoint: 'http://api.localhost:3000/graphql',
        headers: {
          Authorization: 'Bearer test-token',
        },
        tool,
        args: {
          ping: 'pong',
        },
        selectPolicy: 'auto-minimal',
      });

      expect(result.data).toMatchObject({
        label: 'query-client',
        endpoint: 'http://api.localhost:3000/graphql',
        args: {
          ping: 'pong',
        },
        options: {
          select: {
            __typename: true,
          },
        },
      });
    } finally {
      rmSync(fixture.root, {
        recursive: true,
        force: true,
      });
    }
  });
});
