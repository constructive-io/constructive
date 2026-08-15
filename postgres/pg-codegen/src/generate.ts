/**
 * The generation pipeline: introspect -> IR -> emitted file tree, plus the
 * filesystem write and `--check` drift comparison.
 */
import { promises as fs } from 'fs';
import { introspect } from 'introspectron';
import path from 'path';
import { ClientBase } from 'pg';

import { emitRootIndex, emitSchemaIndex, tableFileName } from './emit/barrel';
import { emitClientRuntime, emitSchemaDbModule } from './emit/client';
import { emitEnumsModule } from './emit/enums';
import { emitRecordModule } from './emit/record';
import { buildIr, Ir, IrTableFilter } from './ir';

/** Emit the full generated file tree (relative path -> content) from an IR. */
export const emitFileTree = (ir: Ir): Record<string, string> => {
  const files: Record<string, string> = {};
  for (const schema of ir.schemas) {
    if (schema.enums.length > 0) {
      files[`${schema.name}/enums.ts`] = emitEnumsModule(schema.enums);
    }
    for (const table of schema.tables) {
      files[`${schema.name}/${tableFileName(table.name)}.ts`] = emitRecordModule(table);
    }
    files[`${schema.name}/db.ts`] = emitSchemaDbModule(schema);
    files[`${schema.name}/index.ts`] = emitSchemaIndex(schema);
  }
  files['client.ts'] = emitClientRuntime();
  files['index.ts'] = emitRootIndex(ir.schemas);
  return files;
};

export interface GenerateOptions {
  schemas: string[];
  /** Which tables of those schemas to emit; child partitions are never emitted. */
  tables?: IrTableFilter;
}

/** Introspect `schemas` through the given client and emit the file tree. */
export const generate = async (
  client: ClientBase,
  { schemas, tables }: GenerateOptions
): Promise<Record<string, string>> => {
  const introspection = await introspect(client, { schemas });
  const ir = buildIr(introspection, { schemas, tables });
  return emitFileTree(ir);
};

/** Write an emitted file tree under `outDir`, creating directories as needed. */
export const writeFileTree = async (
  outDir: string,
  files: Record<string, string>
): Promise<void> => {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(outDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
  }
};

export interface DriftReport {
  /** Files the generator emits that are absent on disk. */
  missing: string[];
  /** Files on disk whose content no longer matches the generator's output. */
  stale: string[];
}

export const isClean = (report: DriftReport): boolean =>
  report.missing.length === 0 && report.stale.length === 0;

/** Compare an emitted file tree against what is committed under `outDir`. */
export const checkFileTree = async (
  outDir: string,
  files: Record<string, string>
): Promise<DriftReport> => {
  const missing: string[] = [];
  const stale: string[] = [];
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(outDir, relativePath);
    let existing: string;
    try {
      existing = await fs.readFile(fullPath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        missing.push(relativePath);
        continue;
      }
      throw error;
    }
    if (existing !== content) stale.push(relativePath);
  }
  return { missing, stale };
};
