/**
 * Writing and pruning of generated agent skills.
 *
 * A generated skill is a directory `<skillsDir>/<skillName>/` holding a
 * `SKILL.md` and `references/*.md`. The skills directory is shared with
 * hand-written skills, so pruning is scoped to what the generator owns:
 * - a skill directory written in this run is left with exactly the files
 *   written in this run
 * - a skill directory that was not written is only removed when its SKILL.md
 *   carries the generator marker and it belongs to a family (`orm-`, `cli-`,
 *   `hooks-`) that this run generated
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { type GeneratedFile, writeGeneratedFiles, type WriteResult } from './writer';

/** Marker the docs generators put in every generated SKILL.md. */
export const GENERATED_SKILL_MARKER =
  '<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->';

export interface WriteSkillsResult extends WriteResult {
  /** Names of the skill directories written, relative to the skills dir */
  skillNames: string[];
  /** Absolute paths of stale files removed from those directories */
  filesRemoved: string[];
}

function getSkillName(filePath: string): string | null {
  const segments = filePath.split(/[\\/]/).filter(Boolean);
  return segments.length > 1 ? segments[0] : null;
}

function findFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function removeEmptyDirs(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(dir, entry.name);
    removeEmptyDirs(fullPath);
    if (fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath);
  }
}

/**
 * Write generated skill files and remove every other file from the skill
 * directories they belong to. Sibling skill directories are not touched.
 */
export async function writeGeneratedSkills(
  files: GeneratedFile[],
  skillsDir: string,
): Promise<WriteSkillsResult> {
  const writeResult = await writeGeneratedFiles(files, skillsDir, [], {
    pruneStaleFiles: false,
  });
  const skillNames = Array.from(
    new Set(files.map((f) => getSkillName(f.path)).filter((n): n is string => !!n)),
  ).sort();
  const filesRemoved: string[] = [];
  if (!writeResult.success) {
    return { ...writeResult, skillNames, filesRemoved };
  }

  const expected = new Set(files.map((f) => path.resolve(skillsDir, f.path)));
  const errors: string[] = [];
  for (const skillName of skillNames) {
    const skillDir = path.resolve(skillsDir, skillName);
    try {
      for (const existing of findFiles(skillDir)) {
        if (expected.has(path.resolve(existing))) continue;
        fs.rmSync(existing, { force: true });
        filesRemoved.push(existing);
      }
      removeEmptyDirs(skillDir);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to prune stale skill files in ${skillDir}: ${message}`);
    }
  }

  return {
    ...writeResult,
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    skillNames,
    filesRemoved,
  };
}

function getSkillFamily(skillName: string): string | null {
  const dash = skillName.indexOf('-');
  return dash > 0 ? skillName.slice(0, dash) : null;
}

/**
 * Remove generated skill directories that the current run no longer produces
 * (e.g. the skills of an API target that was dropped).
 * Only directories marked as generated, in a family the run generated, are
 * eligible; `keepTargetNames` protects the skills of targets that are still
 * configured but were not regenerated. Returns the names of the directories
 * removed.
 */
export function removeStaleGeneratedSkills(
  skillsDir: string,
  currentSkillNames: string[],
  keepTargetNames: string[] = [],
): string[] {
  const removed: string[] = [];
  if (!fs.existsSync(skillsDir)) return removed;

  const current = new Set(currentSkillNames);
  const families = new Set(
    currentSkillNames.map(getSkillFamily).filter((f): f is string => !!f),
  );
  for (const family of families) {
    for (const targetName of keepTargetNames) current.add(`${family}-${targetName}`);
  }

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || current.has(entry.name)) continue;
    const family = getSkillFamily(entry.name);
    if (!family || !families.has(family)) continue;

    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    if (!fs.readFileSync(skillFile, 'utf-8').includes(GENERATED_SKILL_MARKER)) continue;

    fs.rmSync(path.join(skillsDir, entry.name), { recursive: true, force: true });
    removed.push(entry.name);
  }
  return removed.sort();
}
