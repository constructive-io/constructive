import { generateCli } from '../../core/codegen/cli';
import {
  generateReadme as generateCliReadme,
  generateAgentsDocs as generateCliAgentsDocs,
  getCliMcpTools,
  generateSkills as generateCliSkills,
} from '../../core/codegen/cli/docs-generator';
import { resolveDocsConfig } from '../../core/codegen/docs-utils';
import {
  generateOrmReadme,
  generateOrmAgentsDocs,
  getOrmMcpTools,
  generateOrmSkills,
} from '../../core/codegen/orm/docs-generator';
import {
  generateHooksReadme,
  generateHooksAgentsDocs,
  getHooksMcpTools,
  generateHooksSkills,
} from '../../core/codegen/hooks-docs-generator';
import {
  generateTargetReadme,
  generateCombinedMcpConfig,
  generateRootRootReadme,
} from '../../core/codegen/target-docs-generator';
import type {
  CleanFieldType,
  CleanOperation,
  CleanRelations,
  CleanTable,
  CleanTypeRef,
} from '../../types/schema';

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as CleanFieldType,
  string: { gqlType: 'String', isArray: false } as CleanFieldType,
  int: { gqlType: 'Int', isArray: false } as CleanFieldType,
  boolean: { gqlType: 'Boolean', isArray: false } as CleanFieldType,
  datetime: { gqlType: 'Datetime', isArray: false } as CleanFieldType,
};

const emptyRelations: CleanRelations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: [],
};

function createTable(
  partial: Partial<CleanTable> & { name: string },
): CleanTable {
  return {
    name: partial.name,
    fields: partial.fields ?? [],
    relations: partial.relations ?? emptyRelations,
    query: partial.query,
    inflection: partial.inflection,
    constraints: partial.constraints,
  };
}

function createTypeRef(
  kind: CleanTypeRef['kind'],
  name: string | null,
  ofType?: CleanTypeRef,
): CleanTypeRef {
  return { kind, name, ofType };
}

const carTable = createTable({
  name: 'Car',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'make', type: fieldTypes.string },
    { name: 'model', type: fieldTypes.string },
    { name: 'year', type: fieldTypes.int },
    { name: 'isElectric', type: fieldTypes.boolean },
    { name: 'createdAt', type: fieldTypes.datetime },
  ],
  query: {
    all: 'cars',
    one: 'car',
    create: 'createCar',
    update: 'updateCar',
    delete: 'deleteCar',
  },
});

const driverTable = createTable({
  name: 'Driver',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
    { name: 'licenseNumber', type: fieldTypes.string },
  ],
  query: {
    all: 'drivers',
    one: 'driver',
    create: 'createDriver',
    update: 'updateDriver',
    delete: 'deleteDriver',
  },
});

const loginMutation: CleanOperation = {
  name: 'login',
  kind: 'mutation',
  args: [
    {
      name: 'email',
      type: createTypeRef(
        'NON_NULL',
        null,
        createTypeRef('SCALAR', 'String'),
      ),
    },
    {
      name: 'password',
      type: createTypeRef(
        'NON_NULL',
        null,
        createTypeRef('SCALAR', 'String'),
      ),
    },
  ],
  returnType: createTypeRef('OBJECT', 'LoginPayload'),
  description: 'Authenticate a user',
};

const currentUserQuery: CleanOperation = {
  name: 'currentUser',
  kind: 'query',
  args: [],
  returnType: createTypeRef('OBJECT', 'User'),
  description: 'Get the currently authenticated user',
};

describe('cli-generator', () => {
  const result = generateCli({
    tables: [carTable, driverTable],
    customOperations: {
      queries: [currentUserQuery],
      mutations: [loginMutation],
    },
    config: {
      cli: { toolName: 'myapp' },
    },
  });

  it('returns correct stats', () => {
    expect(result.stats).toEqual({
      tables: 2,
      customQueries: 1,
      customMutations: 1,
      infraFiles: 3,
      totalFiles: 8,
    });
  });

  it('generates executor.ts', () => {
    const file = result.files.find((f) => f.fileName === 'executor.ts');
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates commands/context.ts', () => {
    const file = result.files.find(
      (f) => f.fileName === 'commands/context.ts',
    );
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates commands/auth.ts', () => {
    const file = result.files.find((f) => f.fileName === 'commands/auth.ts');
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates commands/car.ts', () => {
    const file = result.files.find((f) => f.fileName === 'commands/car.ts');
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates commands/driver.ts', () => {
    const file = result.files.find(
      (f) => f.fileName === 'commands/driver.ts',
    );
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates commands/login.ts (custom mutation)', () => {
    const file = result.files.find((f) => f.fileName === 'commands/login.ts');
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates commands/current-user.ts (custom query)', () => {
    const file = result.files.find(
      (f) => f.fileName === 'commands/current-user.ts',
    );
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates commands.ts (command map)', () => {
    const file = result.files.find((f) => f.fileName === 'commands.ts');
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });


  it('uses ORM methods in table commands', () => {
    const carFile = result.files.find(
      (f) => f.fileName === 'commands/car.ts',
    );
    expect(carFile!.content).toContain('getClient');
    expect(carFile!.content).toContain('.findMany(');
    expect(carFile!.content).toContain('.execute()');
    expect(carFile!.content).toContain('JSON.stringify');
  });

  it('uses ORM methods in custom commands', () => {
    const loginFile = result.files.find(
      (f) => f.fileName === 'commands/login.ts',
    );
    expect(loginFile!.content).toContain('getClient');
    expect(loginFile!.content).toContain('.mutation.');
    expect(loginFile!.content).toContain('.execute()');
  });

  it('uses appstash config-store in executor', () => {
    const executor = result.files.find((f) => f.fileName === 'executor.ts');
    expect(executor!.content).toContain('createConfigStore');
    expect(executor!.content).toContain('"myapp"');
    expect(executor!.content).toContain('createClient');
  });

  it('generates correct file names', () => {
    const fileNames = result.files.map((f) => f.fileName).sort();
    expect(fileNames).toEqual([
      'commands.ts',
      'commands/auth.ts',
      'commands/car.ts',
      'commands/context.ts',
      'commands/current-user.ts',
      'commands/driver.ts',
      'commands/login.ts',
      'executor.ts',
    ]);
  });
});

const allCustomOps: CleanOperation[] = [currentUserQuery, loginMutation];

describe('cli docs generator', () => {
  it('generates CLI README', () => {
    const readme = generateCliReadme([carTable, driverTable], allCustomOps, 'myapp');
    expect(readme.fileName).toBe('README.md');
    expect(readme.content).toMatchSnapshot();
  });

  it('generates CLI AGENTS.md', () => {
    const agents = generateCliAgentsDocs([carTable, driverTable], allCustomOps, 'myapp');
    expect(agents.fileName).toBe('AGENTS.md');
    expect(agents.content).toMatchSnapshot();
  });

  it('generates CLI MCP tools', () => {
    const tools = getCliMcpTools([carTable, driverTable], allCustomOps, 'myapp');
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('generates CLI skill files', () => {
    const skills = generateCliSkills([carTable, driverTable], allCustomOps, 'myapp');
    expect(skills.length).toBeGreaterThan(0);
    for (const sf of skills) {
      expect(sf.content).toMatchSnapshot();
    }
  });
});

describe('orm docs generator', () => {
  it('generates ORM README', () => {
    const readme = generateOrmReadme([carTable, driverTable], allCustomOps);
    expect(readme.fileName).toBe('README.md');
    expect(readme.content).toMatchSnapshot();
  });

  it('generates ORM AGENTS.md', () => {
    const agents = generateOrmAgentsDocs([carTable, driverTable], allCustomOps);
    expect(agents.fileName).toBe('AGENTS.md');
    expect(agents.content).toMatchSnapshot();
  });

  it('generates ORM MCP tools', () => {
    const tools = getOrmMcpTools([carTable, driverTable], allCustomOps);
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('generates ORM skill files', () => {
    const skills = generateOrmSkills([carTable, driverTable], allCustomOps);
    expect(skills.length).toBeGreaterThan(0);
    for (const sf of skills) {
      expect(sf.content).toMatchSnapshot();
    }
  });
});

describe('hooks docs generator', () => {
  it('generates hooks README', () => {
    const readme = generateHooksReadme([carTable, driverTable], allCustomOps);
    expect(readme.fileName).toBe('README.md');
    expect(readme.content).toMatchSnapshot();
  });

  it('generates hooks AGENTS.md', () => {
    const agents = generateHooksAgentsDocs([carTable, driverTable], allCustomOps);
    expect(agents.fileName).toBe('AGENTS.md');
    expect(agents.content).toMatchSnapshot();
  });

  it('generates hooks MCP tools', () => {
    const tools = getHooksMcpTools([carTable, driverTable], allCustomOps);
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('generates hooks skill files', () => {
    const skills = generateHooksSkills([carTable, driverTable], allCustomOps);
    expect(skills.length).toBeGreaterThan(0);
    for (const sf of skills) {
      expect(sf.content).toMatchSnapshot();
    }
  });
});

describe('target docs generator', () => {
  it('generates per-target README', () => {
    const readme = generateTargetReadme({
      hasOrm: true,
      hasHooks: true,
      hasCli: true,
      tableCount: 2,
      customQueryCount: 1,
      customMutationCount: 1,
      config: { cli: { toolName: 'myapp' } },
    });
    expect(readme.fileName).toBe('README.md');
    expect(readme.content).toMatchSnapshot();
  });

  it('generates combined MCP config', () => {
    const cliTools = getCliMcpTools([carTable, driverTable], allCustomOps, 'myapp');
    const ormTools = getOrmMcpTools([carTable, driverTable], allCustomOps);
    const allTools = [...cliTools, ...ormTools];
    const mcp = generateCombinedMcpConfig(allTools, 'myapp');
    expect(mcp.fileName).toBe('mcp.json');
    const parsed = JSON.parse(mcp.content);
    expect(parsed.name).toBe('myapp');
    expect(parsed.tools.length).toBe(allTools.length);
    expect(mcp.content).toMatchSnapshot();
  });

  it('generates root-root README for multi-target', () => {
    const readme = generateRootRootReadme([
      { name: 'auth', output: './generated/auth', endpoint: 'http://auth.localhost/graphql', generators: ['ORM'] },
      { name: 'app', output: './generated/app', endpoint: 'http://app.localhost/graphql', generators: ['ORM', 'React Query', 'CLI'] },
    ]);
    expect(readme.fileName).toBe('README.md');
    expect(readme.content).toMatchSnapshot();
  });
});

describe('resolveDocsConfig', () => {
  it('defaults to readme + agents', () => {
    const config = resolveDocsConfig(undefined);
    expect(config).toEqual({ readme: true, agents: true, mcp: false, skills: false });
  });

  it('docs: true enables all', () => {
    const config = resolveDocsConfig(true);
    expect(config).toEqual({ readme: true, agents: true, mcp: true, skills: true });
  });

  it('docs: false disables all', () => {
    const config = resolveDocsConfig(false);
    expect(config).toEqual({ readme: false, agents: false, mcp: false, skills: false });
  });

  it('partial config fills defaults', () => {
    const config = resolveDocsConfig({ mcp: true });
    expect(config).toEqual({ readme: true, agents: true, mcp: true, skills: false });
  });
});
