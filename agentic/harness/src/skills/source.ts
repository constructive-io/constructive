import * as fs from 'fs';
import * as path from 'path';

import { HarnessSkill, SkillFile } from '../types';
import { parseFrontmatter } from './frontmatter';

/**
 * A resolvable layer of skills. Implementations: local directory (vendored
 * snapshot, git checkout, unpacked npm release). Network fetchers resolve a
 * release into a local directory and hand it to `DirectorySkillSource`.
 */
export interface SkillSource {
  name: string;
  load(): Promise<HarnessSkill[]>;
}

/**
 * Loads skills from a directory of `<skill-name>/SKILL.md` folders — the
 * agentskills.io layout used by `constructive-skills` (`.agents/skills/`) and
 * by unpacked release tarballs.
 */
export class DirectorySkillSource implements SkillSource {
  constructor(
    public readonly name: string,
    private readonly dir: string
  ) {}

  async load(): Promise<HarnessSkill[]> {
    if (!fs.existsSync(this.dir)) {
      throw new Error(`Skill source directory not found: ${this.dir}`);
    }
    const skills: HarnessSkill[] = [];
    for (const entry of fs.readdirSync(this.dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(this.dir, entry.name);
      const skillMd = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const raw = fs.readFileSync(skillMd, 'utf8');
      const { name, description } = parseFrontmatter(raw);
      const files: SkillFile[] = [{ relPath: 'SKILL.md', contents: raw }];
      collectExtraFiles(skillDir, '', files);
      skills.push({ name, description, files, sourceName: this.name });
    }
    return skills;
  }
}

function collectExtraFiles(root: string, rel: string, out: SkillFile[]): void {
  const dir = path.join(root, rel);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryRel = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      collectExtraFiles(root, entryRel, out);
    } else if (entry.isFile() && entryRel !== 'SKILL.md') {
      out.push({
        relPath: entryRel,
        contents: fs.readFileSync(path.join(root, entryRel), 'utf8'),
      });
    }
  }
}
