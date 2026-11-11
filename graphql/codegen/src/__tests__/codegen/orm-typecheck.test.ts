import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { generateOrm } from '../../core/codegen/orm';
import type { FieldType, Table } from '../../types/schema';

const uuid = { gqlType: 'UUID', isArray: false } as FieldType;
const string = { gqlType: 'String', isArray: false } as FieldType;

function typeCheck(files: { path: string; content: string }[]): string[] {
  const dir = fs.mkdtempSync(path.join(__dirname, '.orm-typecheck-'));
  try {
    const fileNames = files.map((file) => {
      const fileName = path.join(dir, file.path);
      fs.mkdirSync(path.dirname(fileName), { recursive: true });
      fs.writeFileSync(fileName, file.content);
      return fileName;
    });
    const program = ts.createProgram(fileNames, {
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
      strict: true,
      strictNullChecks: false
    });
    return ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.file?.fileName.startsWith(dir))
      .map((d) => `${path.relative(dir, d.file!.fileName)}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('generated ORM for a table without a create mutation', () => {
  const fileTable: Table = {
    name: 'File',
    fields: [
      { name: 'id', type: uuid },
      { name: 'filename', type: string }
    ],
    relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
    query: {
      all: 'files',
      one: 'file',
      create: null,
      update: 'updateFile',
      delete: 'deleteFile',
      bulkInsert: 'bulkCreateFiles',
      bulkUpsert: 'bulkUpsertFiles'
    }
  };
  const { files } = generateOrm({ tables: [fileTable], config: {} as any });
  const model = files.find((f) => f.path === 'models/file.ts');

  it('has no create, bulkCreate or bulkUpsert', () => {
    expect(model).toBeDefined();
    expect(model!.content).not.toContain('CreateFileInput');
    expect(model!.content).not.toContain('bulkCreate');
    expect(model!.content).not.toContain('bulkUpsert');
    expect(model!.content).toContain('update<');
  });

  it('type-checks', () => {
    expect(typeCheck(files)).toEqual([]);
  });
});
