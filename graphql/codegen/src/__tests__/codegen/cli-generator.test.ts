import { generateCli } from '../../core/codegen/cli';
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
      totalFiles: 10,
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

  it('generates README.md', () => {
    const file = result.files.find((f) => f.fileName === 'README.md');
    expect(file).toBeDefined();
    expect(file!.content).toMatchSnapshot();
  });

  it('generates COMMANDS.md (man-page reference)', () => {
    const file = result.files.find((f) => f.fileName === 'COMMANDS.md');
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
      'COMMANDS.md',
      'README.md',
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
