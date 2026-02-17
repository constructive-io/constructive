import { generateCli, generateMultiTargetCli, resolveInfraNames } from '../../core/codegen/cli';
import {
  generateReadme as generateCliReadme,
  generateAgentsDocs as generateCliAgentsDocs,
  getCliMcpTools,
  generateSkills as generateCliSkills,
  generateMultiTargetReadme,
  generateMultiTargetAgentsDocs,
  getMultiTargetCliMcpTools,
  generateMultiTargetSkills,
} from '../../core/codegen/cli/docs-generator';
import type { MultiTargetDocsInput } from '../../core/codegen/cli/docs-generator';
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

describe('resolveInfraNames', () => {
  it('uses defaults when no collisions', () => {
    expect(resolveInfraNames(['app', 'members'])).toEqual({
      auth: 'auth',
      context: 'context',
    });
  });

  it('renames auth to credentials on collision', () => {
    expect(resolveInfraNames(['auth', 'members', 'app'])).toEqual({
      auth: 'credentials',
      context: 'context',
    });
  });

  it('renames context to env on collision', () => {
    expect(resolveInfraNames(['context', 'app'])).toEqual({
      auth: 'auth',
      context: 'env',
    });
  });

  it('renames both on collision', () => {
    expect(resolveInfraNames(['auth', 'context', 'app'])).toEqual({
      auth: 'credentials',
      context: 'env',
    });
  });

  it('respects user overrides even with collisions', () => {
    expect(
      resolveInfraNames(['auth', 'app'], { auth: 'auth' }),
    ).toEqual({
      auth: 'auth',
      context: 'context',
    });
  });

  it('uses user override names', () => {
    expect(
      resolveInfraNames(['app'], { auth: 'creds', context: 'profile' }),
    ).toEqual({
      auth: 'creds',
      context: 'profile',
    });
  });
});

const userTable = createTable({
  name: 'User',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'email', type: fieldTypes.string },
    { name: 'name', type: fieldTypes.string },
  ],
  query: {
    all: 'users',
    one: 'user',
    create: 'createUser',
    update: 'updateUser',
    delete: 'deleteUser',
  },
});

const memberTable = createTable({
  name: 'Member',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'role', type: fieldTypes.string },
  ],
  query: {
    all: 'members',
    one: 'member',
    create: 'createMember',
    update: 'updateMember',
    delete: 'deleteMember',
  },
});

describe('multi-target cli generator', () => {
  const multiResult = generateMultiTargetCli({
    toolName: 'myapp',
    targets: [
      {
        name: 'auth',
        endpoint: 'http://auth.localhost/graphql',
        ormImportPath: '../../generated/auth/orm',
        tables: [userTable],
        customOperations: {
          queries: [currentUserQuery],
          mutations: [loginMutation],
        },
        isAuthTarget: true,
      },
      {
        name: 'members',
        endpoint: 'http://members.localhost/graphql',
        ormImportPath: '../../generated/members/orm',
        tables: [memberTable],
        customOperations: {
          queries: [],
          mutations: [],
        },
      },
      {
        name: 'app',
        endpoint: 'http://app.localhost/graphql',
        ormImportPath: '../../generated/app/orm',
        tables: [carTable],
        customOperations: {
          queries: [],
          mutations: [],
        },
      },
    ],
  });

  it('returns correct stats', () => {
    expect(multiResult.stats).toEqual({
      tables: 3,
      customQueries: 1,
      customMutations: 1,
      infraFiles: 3,
      totalFiles: 9,
    });
  });

  it('auto-renames auth infra to credentials on collision', () => {
    const fileNames = multiResult.files.map((f) => f.fileName).sort();
    expect(fileNames).toContain('commands/credentials.ts');
    expect(fileNames).not.toContain('commands/auth.ts');
  });

  it('generates correct file names with target prefixes', () => {
    const fileNames = multiResult.files.map((f) => f.fileName).sort();
    expect(fileNames).toEqual([
      'commands.ts',
      'commands/app/car.ts',
      'commands/auth/current-user.ts',
      'commands/auth/login.ts',
      'commands/auth/user.ts',
      'commands/context.ts',
      'commands/credentials.ts',
      'commands/members/member.ts',
      'executor.ts',
    ]);
  });

  it('generates multi-target executor', () => {
    const file = multiResult.files.find((f) => f.fileName === 'executor.ts');
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates multi-target context command', () => {
    const file = multiResult.files.find(
      (f) => f.fileName === 'commands/context.ts',
    );
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates credentials command (renamed from auth)', () => {
    const file = multiResult.files.find(
      (f) => f.fileName === 'commands/credentials.ts',
    );
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates target-prefixed table commands', () => {
    const userFile = multiResult.files.find(
      (f) => f.fileName === 'commands/auth/user.ts',
    );
    expect(userFile).toBeDefined();
    expect(userFile!.content).toMatchSnapshot();

    const memberFile = multiResult.files.find(
      (f) => f.fileName === 'commands/members/member.ts',
    );
    expect(memberFile).toBeDefined();
    expect(memberFile!.content).toMatchSnapshot();

    const carFile = multiResult.files.find(
      (f) => f.fileName === 'commands/app/car.ts',
    );
    expect(carFile).toBeDefined();
    expect(carFile!.content).toMatchSnapshot();
  });

  it('generates target-prefixed custom commands with save-token', () => {
    const loginFile = multiResult.files.find(
      (f) => f.fileName === 'commands/auth/login.ts',
    );
    expect(loginFile).toBeDefined();
    expect(loginFile!.content).toContain('saveToken');
    expect(loginFile!.content).toMatchSnapshot();
  });

  it('generates multi-target command map', () => {
    const file = multiResult.files.find((f) => f.fileName === 'commands.ts');
    expect(file).toBeDefined();
    expect(file!.content).toContain('auth:user');
    expect(file!.content).toContain('auth:login');
    expect(file!.content).toContain('members:member');
    expect(file!.content).toContain('app:car');
    expect(file!.content).toContain('credentials');
    expect(file!.content).toContain('context');
    expect(file!.content).toMatchSnapshot();
  });

  it('uses correct executor import path in target commands', () => {
    const userFile = multiResult.files.find(
      (f) => f.fileName === 'commands/auth/user.ts',
    );
    expect(userFile!.content).toContain('../../executor');
  });
});

describe('multi-target cli docs', () => {
  const docsInput: MultiTargetDocsInput = {
    toolName: 'myapp',
    infraNames: { auth: 'credentials', context: 'context' },
    targets: [
      {
        name: 'auth',
        endpoint: 'http://auth.localhost/graphql',
        tables: [userTable],
        customOperations: [currentUserQuery, loginMutation],
        isAuthTarget: true,
      },
      {
        name: 'members',
        endpoint: 'http://members.localhost/graphql',
        tables: [memberTable],
        customOperations: [],
      },
      {
        name: 'app',
        endpoint: 'http://app.localhost/graphql',
        tables: [carTable],
        customOperations: [],
      },
    ],
  };

  it('generates multi-target README', () => {
    const readme = generateMultiTargetReadme(docsInput);
    expect(readme.fileName).toBe('README.md');
    expect(readme.content).toContain('myapp');
    expect(readme.content).toContain('auth:user');
    expect(readme.content).toContain('members:member');
    expect(readme.content).toContain('app:car');
    expect(readme.content).toContain('credentials');
    expect(readme.content).toContain('context');
    expect(readme.content).toMatchSnapshot();
  });

  it('generates multi-target AGENTS.md', () => {
    const agents = generateMultiTargetAgentsDocs(docsInput);
    expect(agents.fileName).toBe('AGENTS.md');
    expect(agents.content).toContain('auth:user');
    expect(agents.content).toContain('members:member');
    expect(agents.content).toContain('app:car');
    expect(agents.content).toMatchSnapshot();
  });

  it('generates multi-target MCP tools', () => {
    const tools = getMultiTargetCliMcpTools(docsInput);
    expect(tools.length).toBeGreaterThan(0);
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('myapp_credentials_set_token');
    expect(toolNames).toContain('myapp_context_create');
    expect(toolNames.some((n) => n.includes('auth_user'))).toBe(true);
    expect(toolNames.some((n) => n.includes('members_member'))).toBe(true);
    expect(toolNames.some((n) => n.includes('app_car'))).toBe(true);
    expect(tools).toMatchSnapshot();
  });

  it('generates multi-target skills', () => {
    const skills = generateMultiTargetSkills(docsInput);
    expect(skills.length).toBeGreaterThan(0);
    const fileNames = skills.map((s) => s.fileName);
    expect(fileNames.some((n) => n.includes('auth-'))).toBe(true);
    expect(fileNames.some((n) => n.includes('members-'))).toBe(true);
    expect(fileNames.some((n) => n.includes('app-'))).toBe(true);
    expect(skills).toMatchSnapshot();
  });

  it('handles collision-renamed infra in docs', () => {
    const collisionInput: MultiTargetDocsInput = {
      toolName: 'myapp',
      infraNames: { auth: 'credentials', context: 'env' },
      targets: docsInput.targets,
    };
    const readme = generateMultiTargetReadme(collisionInput);
    expect(readme.content).toContain('credentials');
    expect(readme.content).toContain('env');
  });
});

describe('multi-target cli with custom infraNames', () => {
  const result = generateMultiTargetCli({
    toolName: 'myapp',
    infraNames: { auth: 'creds', context: 'profile' },
    targets: [
      {
        name: 'auth',
        endpoint: 'http://auth.localhost/graphql',
        ormImportPath: '../../generated/auth/orm',
        tables: [userTable],
        customOperations: { queries: [], mutations: [] },
      },
      {
        name: 'app',
        endpoint: 'http://app.localhost/graphql',
        ormImportPath: '../../generated/app/orm',
        tables: [carTable],
        customOperations: { queries: [], mutations: [] },
      },
    ],
  });

  it('uses custom infraNames from config', () => {
    const fileNames = result.files.map((f) => f.fileName).sort();
    expect(fileNames).toContain('commands/creds.ts');
    expect(fileNames).toContain('commands/profile.ts');
    expect(fileNames).not.toContain('commands/auth.ts');
    expect(fileNames).not.toContain('commands/context.ts');
  });
});
