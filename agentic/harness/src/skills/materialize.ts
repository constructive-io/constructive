import * as fs from 'fs';
import * as path from 'path';

import { HarnessSkill } from '../types';

export interface MaterializeOptions {
  /**
   * `{{VAR}}` substitutions applied to every skill file, e.g.
   * `{ HARNESS_TEMPLATES_DIR: '/abs/path' }`. Host adapters supply real paths.
   */
  templateVars?: Record<string, string>;
}

/**
 * Write a resolved skill set to `<targetDir>/<skill-name>/…`, replacing any
 * previous contents so removed skills do not linger.
 */
export function materializeSkills(
  targetDir: string,
  skills: HarnessSkill[],
  options: MaterializeOptions = {}
): string[] {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  const written: string[] = [];
  for (const skill of skills) {
    const skillDir = path.join(targetDir, skill.name);
    for (const file of skill.files) {
      const dest = path.join(skillDir, file.relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, substitute(file.contents, options.templateVars));
    }
    written.push(skillDir);
  }
  return written;
}

function substitute(contents: string, vars?: Record<string, string>): string {
  if (!vars) return contents;
  return contents.replace(/\{\{([A-Z0-9_]+)\}\}/g, (whole, key: string) =>
    key in vars ? vars[key] : whole
  );
}
