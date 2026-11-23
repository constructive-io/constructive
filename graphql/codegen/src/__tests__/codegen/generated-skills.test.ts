import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  GENERATED_SKILL_MARKER,
  removeStaleGeneratedSkills,
  writeGeneratedSkills,
} from '../../core/output';

describe('generated skills', () => {
  let skillsDir: string;

  const write = (relativePath: string, content: string): string => {
    const filePath = path.join(skillsDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return filePath;
  };
  const generatedSkill = `---\nname: x\n---\n\n${GENERATED_SKILL_MARKER}\n`;

  beforeEach(() => {
    skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-skills-test-'));
  });

  afterEach(() => {
    fs.rmSync(skillsDir, { recursive: true, force: true });
  });

  it('leaves a generated skill directory with exactly the files it wrote', async () => {
    const staleRef = write('orm-auth/references/request-upload-url.md', 'stale');
    const staleNested = write('orm-auth/old/nested/file.md', 'stale');
    write('orm-auth/SKILL.md', 'old');

    const result = await writeGeneratedSkills(
      [
        { path: 'orm-auth/SKILL.md', content: generatedSkill },
        { path: 'orm-auth/references/user.md', content: '# user\n' },
      ],
      skillsDir,
    );

    expect(result.success).toBe(true);
    expect(result.skillNames).toEqual(['orm-auth']);
    expect(result.filesRemoved.sort()).toEqual([staleNested, staleRef].sort());
    expect(fs.readdirSync(path.join(skillsDir, 'orm-auth')).sort()).toEqual([
      'SKILL.md',
      'references',
    ]);
    expect(fs.readdirSync(path.join(skillsDir, 'orm-auth', 'references'))).toEqual([
      'user.md',
    ]);
    expect(fs.readFileSync(path.join(skillsDir, 'orm-auth', 'SKILL.md'), 'utf-8')).toBe(
      generatedSkill,
    );
  });

  it('does not touch sibling skill directories when writing', async () => {
    const handWritten = write('pgpm/references/deploy.md', 'hand-written');
    const otherGenerated = write('orm-admin/references/stale.md', 'other run');

    await writeGeneratedSkills(
      [{ path: 'orm-auth/SKILL.md', content: generatedSkill }],
      skillsDir,
    );

    expect(fs.existsSync(handWritten)).toBe(true);
    expect(fs.existsSync(otherGenerated)).toBe(true);
  });

  it('removes generated skills of targets that are no longer generated', () => {
    write('orm-auth/SKILL.md', generatedSkill);
    write('orm-public/SKILL.md', generatedSkill);
    write('orm-public/references/user.md', '# user\n');

    expect(removeStaleGeneratedSkills(skillsDir, ['orm-auth'])).toEqual(['orm-public']);
    expect(fs.existsSync(path.join(skillsDir, 'orm-public'))).toBe(false);
    expect(fs.existsSync(path.join(skillsDir, 'orm-auth', 'SKILL.md'))).toBe(true);
  });

  it('keeps generated skills of configured targets that were not regenerated', () => {
    write('orm-auth/SKILL.md', generatedSkill);
    write('orm-cluster/SKILL.md', generatedSkill);
    write('orm-public/SKILL.md', generatedSkill);

    expect(removeStaleGeneratedSkills(skillsDir, ['orm-auth'], ['cluster'])).toEqual([
      'orm-public',
    ]);
    expect(fs.existsSync(path.join(skillsDir, 'orm-cluster'))).toBe(true);
  });

  it('keeps hand-written skills and generated skills of other families', () => {
    // same family prefix, but no generator marker
    write('orm-guide/SKILL.md', '---\nname: orm-guide\n---\n\nHand-written.\n');
    // generated, but by a run that produces a different family
    write('hooks-public/SKILL.md', generatedSkill);
    // unrelated hand-written skill
    write('pgpm/SKILL.md', '---\nname: pgpm\n---\n');
    // no SKILL.md at all
    write('orm-notes/README.md', 'notes');

    expect(removeStaleGeneratedSkills(skillsDir, ['orm-auth'])).toEqual([]);
    for (const name of ['orm-guide', 'hooks-public', 'pgpm', 'orm-notes']) {
      expect(fs.existsSync(path.join(skillsDir, name))).toBe(true);
    }
  });
});
