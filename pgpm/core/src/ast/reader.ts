import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { parseControlFile } from '../files/extension/reader';
import { parsePlanFile } from '../files/plan/parser';
import { parsePgpmHeader } from '../files/sql/header';
import { readScript, scriptExists } from '../files/sql-scripts/reader';
import {
  PgpmChangeAst,
  PgpmControlAst,
  PgpmModuleAst,
  PgpmScriptAst,
  PgpmScriptKind
} from './types';

function readScriptAst(
  dir: string,
  kind: PgpmScriptKind,
  change: string
): PgpmScriptAst | null {
  if (!scriptExists(dir, kind, change)) return null;
  const raw = readScript(dir, kind, change);
  const { header, body } = parsePgpmHeader(raw);
  return { kind, header, body, raw };
}

/**
 * Read a pgpm module directory into the unified {@link PgpmModuleAst}.
 *
 * Composes the existing plan parser, control reader, and SQL header parser — it
 * does not re-implement any parsing. The module is addressed by plan order: the
 * `changes` array follows `pgpm.plan`, and each change eagerly parses its
 * deploy/revert/verify scripts (missing ones are `null`). Every leaf retains its
 * byte-exact source so {@link writeModule} can reproduce the module losslessly.
 *
 * @throws when `dir` has no `pgpm.plan`, or the plan fails to parse.
 */
export function readModule(dir: string): PgpmModuleAst {
  const planPath = join(dir, 'pgpm.plan');
  if (!existsSync(planPath)) {
    throw new Error(`No pgpm.plan found in module directory: ${dir}`);
  }

  const planRaw = readFileSync(planPath, 'utf-8');
  const parsed = parsePlanFile(planPath);
  if (!parsed.data) {
    const detail = parsed.errors
      .map(e => `line ${e.line}: ${e.message}`)
      .join('; ');
    throw new Error(`Failed to parse plan file ${planPath}: ${detail}`);
  }

  const plan = parsed.data;
  const name = plan.package;

  let control: PgpmControlAst | null = null;
  if (name) {
    const fileName = `${name}.control`;
    const controlPath = join(dir, fileName);
    if (existsSync(controlPath)) {
      const raw = readFileSync(controlPath, 'utf-8');
      const info = parseControlFile(controlPath, dir);
      control = {
        fileName,
        name,
        requires: info.requires,
        version: info.version,
        raw
      };
    }
  }

  const changes: PgpmChangeAst[] = plan.changes.map(planChange => ({
    name: planChange.name,
    plan: planChange,
    deploy: readScriptAst(dir, 'deploy', planChange.name),
    revert: readScriptAst(dir, 'revert', planChange.name),
    verify: readScriptAst(dir, 'verify', planChange.name)
  }));

  return { dir, name, plan, planRaw, control, changes };
}
