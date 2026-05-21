import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { generate as generateHooks } from '../../core/codegen';
import { generateOrm } from '../../core/codegen/orm';
import type { GraphQLSDKConfigTarget } from '../../types/config';
import type { FieldType, Relations, Table } from '../../types/schema';

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as FieldType,
  string: { gqlType: 'String', isArray: false } as FieldType,
  boolean: { gqlType: 'Boolean', isArray: false } as FieldType,
};

const emptyRelations: Relations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: [],
};

const contactTable: Table = {
  name: 'Contact',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'email', type: fieldTypes.string },
  ],
  relations: emptyRelations,
  constraints: {
    primaryKey: [{ name: 'contacts_pkey', fields: [{ name: 'id', type: fieldTypes.uuid }] }],
    foreignKey: [],
    unique: [],
  },
  query: {
    all: 'contacts',
    one: 'contact',
    create: 'createContact',
    update: 'updateContact',
    delete: 'deleteContact',
  },
  subscription: {
    fieldName: 'onContactChanged',
    payloadTypeName: 'ContactSubscriptionPayload',
    rowFieldName: 'contact',
    payloadMetaFields: ['event', 'rowId', 'overflow'],
    args: [
      {
        name: 'ids',
        type: {
          kind: 'LIST',
          name: null,
          ofType: {
            kind: 'NON_NULL',
            name: null,
            ofType: { kind: 'SCALAR', name: 'UUID' },
          },
        },
      },
    ],
  },
};

// A table with no subscription — tests that mixed inputs don't break the output
const projectTable: Table = {
  name: 'Project',
  fields: [
    { name: 'id', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
    { name: 'active', type: fieldTypes.boolean },
  ],
  relations: emptyRelations,
  constraints: {
    primaryKey: [{ name: 'projects_pkey', fields: [{ name: 'id', type: fieldTypes.uuid }] }],
    foreignKey: [],
    unique: [],
  },
  query: {
    all: 'projects',
    one: 'project',
    create: 'createProject',
    update: 'updateProject',
    delete: 'deleteProject',
  },
};

const config: GraphQLSDKConfigTarget = {
  tables: { include: [], exclude: [], systemExclude: [] },
  queries: { include: [], exclude: [], systemExclude: [] },
  mutations: { include: [], exclude: [], systemExclude: [] },
  codegen: { skipQueryField: false },
  reactQuery: true,
};

function writeFile(root: string, relativePath: string, content: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

function compileFixture(tables: Table[]): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'realtime-codegen-'));
  tempDirs.push(root);

  const orm = generateOrm({ tables, config });
  const hooks = generateHooks({ tables, config });

  // POSIX-only — symlinkSync needs elevated perms on Windows
  fs.symlinkSync(
    path.join(__dirname, '../../../node_modules'),
    path.join(root, 'node_modules'),
    'dir',
  );

  for (const file of orm.files) {
    writeFile(root, path.join('orm', file.path), file.content);
  }
  for (const file of hooks.files) {
    writeFile(root, path.join('hooks', file.path), file.content);
  }

  // Build the include list covering all ORM models (Contact, Project, etc.)
  const modelIncludes = tables.map(
    (t) => `orm/models/${t.name.toLowerCase()}.ts`,
  );

  writeFile(
    root,
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'CommonJS',
          moduleResolution: 'Node',
          esModuleInterop: true,
          strict: true,
          noUnusedLocals: true,
          skipLibCheck: true,
          jsx: 'react-jsx',
        },
        include: [
          'orm/client.ts',
          'orm/index.ts',
          'orm/input-types.ts',
          ...modelIncludes,
          'orm/models/index.ts',
          'orm/query-builder.ts',
          'orm/realtime.ts',
          'orm/select-types.ts',
          'hooks/client.ts',
          'hooks/query-keys.ts',
          'hooks/subscriptions/**/*.ts',
        ],
      },
      null,
      2,
    ),
  );

  try {
    execFileSync(
      path.join(__dirname, '../../../node_modules/.bin/tsc'),
      ['--noEmit', '-p', root],
      { cwd: root, stdio: 'pipe' },
    );
  } catch (error) {
    const err = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(
      `${err.stdout?.toString() ?? ''}${err.stderr?.toString() ?? ''}`,
    );
  }
}

describe('generated subscription output', () => {
  it('type-checks under strict TypeScript with no unused locals', () => {
    compileFixture([contactTable]);
  }, 30000);

  it('type-checks mixed tables (one with subscription, one without)', () => {
    compileFixture([contactTable, projectTable]);
  }, 30000);
});
