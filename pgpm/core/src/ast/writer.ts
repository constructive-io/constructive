import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { generatePlanFileContent } from '../files/plan/writer';
import { writePgpmScript } from '../files/sql/header';
import { PgpmModuleAst, PgpmScriptAst } from './types';

/**
 * Serialize a script AST back to SQL text from its structured header + body.
 * Byte-identical to the source for scripts read via {@link readModule} (the SQL
 * header parser is lossless), and reflects any structural header edits.
 */
export function serializeScript(script: PgpmScriptAst): string {
  return writePgpmScript({ header: script.header, body: script.body });
}

/**
 * Serialize a module's plan back to `pgpm.plan` text from its structured model.
 */
export function serializePlan(module: PgpmModuleAst): string {
  return generatePlanFileContent(module.plan);
}

export interface WriteModuleOptions {
  /** Target directory. Defaults to the module's own `dir`. */
  outDir?: string;
  /**
   * When true (default), write each file from its byte-exact `raw`, producing a
   * lossless copy of the source module. Set false to write from the structured
   * model instead (`serializePlan` / `serializeScript`), e.g. after transforms.
   */
  fromRaw?: boolean;
}

/**
 * Materialize a {@link PgpmModuleAst} back to disk: `pgpm.plan`, the `.control`
 * file (when present), and every change's deploy/revert/verify script.
 *
 * With the default `fromRaw: true` this is a lossless copy of what
 * {@link readModule} loaded; with `fromRaw: false` it emits the structured
 * serialization (used by operators that mutate the AST before writing).
 */
export function writeModule(
  module: PgpmModuleAst,
  options: WriteModuleOptions = {}
): void {
  const outDir = options.outDir ?? module.dir;
  const fromRaw = options.fromRaw ?? true;

  mkdirSync(outDir, { recursive: true });

  writeFileSync(
    join(outDir, 'pgpm.plan'),
    fromRaw ? module.planRaw : serializePlan(module)
  );

  if (module.control) {
    writeFileSync(join(outDir, module.control.fileName), module.control.raw);
  }

  for (const change of module.changes) {
    const scripts = [change.deploy, change.revert, change.verify];
    for (const script of scripts) {
      if (!script) continue;
      const file = join(outDir, script.kind, `${change.name}.sql`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, fromRaw ? script.raw : serializeScript(script));
    }
  }
}
