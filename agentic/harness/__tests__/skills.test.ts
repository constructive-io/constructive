import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { parseFrontmatter } from '../src/skills/frontmatter';
import { layerAllowsSkill, validateManifest } from '../src/skills/manifest';
import { materializeSkills } from '../src/skills/materialize';
import { resolveSkills } from '../src/skills/overlay';
import { DirectorySkillSource } from '../src/skills/source';

function makeSkillDir(
  root: string,
  name: string,
  body: string,
  extra?: Record<string, string>,
  requires?: string[]
) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const requiresLine = requires ? `requires: [${requires.join(', ')}]\n` : '';
  fs.writeFileSync(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: "${name} description"\n${requiresLine}---\n\n${body}\n`
  );
  for (const [rel, contents] of Object.entries(extra ?? {})) {
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, contents);
  }
}

describe('frontmatter', () => {
  it('parses name/description including quoted scalars', () => {
    const parsed = parseFrontmatter('---\nname: a-skill\ndescription: "does: things"\n---\nbody');
    expect(parsed.name).toBe('a-skill');
    expect(parsed.description).toBe('does: things');
    expect(parsed.body).toBe('body');
  });

  it('rejects files without frontmatter', () => {
    expect(() => parseFrontmatter('# no frontmatter')).toThrow(/frontmatter/);
  });

  it('parses requires as inline list, block list, or absent', () => {
    expect(
      parseFrontmatter('---\nname: a\ndescription: d\nrequires: [x, "y"]\n---\nbody').requires
    ).toEqual(['x', 'y']);
    expect(
      parseFrontmatter('---\nname: a\ndescription: d\nrequires:\n  - x\n  - y\n---\nbody')
        .requires
    ).toEqual(['x', 'y']);
    expect(parseFrontmatter('---\nname: a\ndescription: d\n---\nbody').requires).toEqual([]);
  });
});

describe('manifest', () => {
  it('rejects empty and duplicate sources', () => {
    expect(() => validateManifest({ sources: [] })).toThrow(/at least one/);
    expect(() =>
      validateManifest({ sources: [{ name: 'a' }, { name: 'a' }] })
    ).toThrow(/Duplicate/);
  });

  it('applies include/exclude filters', () => {
    expect(layerAllowsSkill({ name: 'l' }, 'x')).toBe(true);
    expect(layerAllowsSkill({ name: 'l', exclude: ['x'] }, 'x')).toBe(false);
    expect(layerAllowsSkill({ name: 'l', include: ['y'] }, 'x')).toBe(false);
    expect(layerAllowsSkill({ name: 'l', include: ['x'] }, 'x')).toBe(true);
  });
});

describe('overlay resolution + materialization', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('merges layers last-write-wins and materializes with template vars', async () => {
    const base = path.join(tmp, 'base');
    const overlay = path.join(tmp, 'overlay');
    makeSkillDir(base, 'alpha', 'base alpha uses {{HARNESS_TEMPLATES_DIR}}', {
      'references/topic.md': 'base topic',
    });
    makeSkillDir(base, 'beta', 'base beta');
    makeSkillDir(overlay, 'alpha', 'overlay alpha');
    makeSkillDir(overlay, 'gamma', 'overlay gamma');

    const skills = await resolveSkills(
      { sources: [{ name: 'base' }, { name: 'overlay' }] },
      [new DirectorySkillSource('base', base), new DirectorySkillSource('overlay', overlay)]
    );

    const byName = new Map(skills.map((s) => [s.name, s]));
    expect([...byName.keys()].sort()).toEqual(['alpha', 'beta', 'gamma']);
    expect(byName.get('alpha')!.sourceName).toBe('overlay');
    // Override is wholesale: base alpha's references/ do not leak through.
    expect(byName.get('alpha')!.files.map((f) => f.relPath)).toEqual(['SKILL.md']);

    const target = path.join(tmp, 'materialized');
    const written = materializeSkills(target, skills, {
      templateVars: { HARNESS_TEMPLATES_DIR: '/templates' },
    });
    expect(written).toHaveLength(3);
    expect(fs.readFileSync(path.join(target, 'beta', 'SKILL.md'), 'utf8')).toContain('base beta');
    expect(fs.readFileSync(path.join(target, 'alpha', 'SKILL.md'), 'utf8')).toContain(
      'overlay alpha'
    );
  });

  it('substitutes only known vars and clears stale skills on re-materialize', async () => {
    const base = path.join(tmp, 'base');
    makeSkillDir(base, 'alpha', 'uses {{HARNESS_TEMPLATES_DIR}} and {{UNKNOWN_VAR}}');
    const skills = await resolveSkills({ sources: [{ name: 'base' }] }, [
      new DirectorySkillSource('base', base),
    ]);
    const target = path.join(tmp, 'materialized');
    materializeSkills(target, skills, { templateVars: { HARNESS_TEMPLATES_DIR: '/t' } });
    const contents = fs.readFileSync(path.join(target, 'alpha', 'SKILL.md'), 'utf8');
    expect(contents).toContain('/t');
    expect(contents).toContain('{{UNKNOWN_VAR}}');

    fs.mkdirSync(path.join(target, 'stale-skill'), { recursive: true });
    materializeSkills(target, skills, {});
    expect(fs.existsSync(path.join(target, 'stale-skill'))).toBe(false);
  });

  it('pulls in `requires:` dependencies past include filters, transitively', async () => {
    const base = path.join(tmp, 'base');
    makeSkillDir(base, 'workflow', 'workflow body', undefined, ['security']);
    makeSkillDir(base, 'security', 'security body', undefined, ['access-control']);
    makeSkillDir(base, 'access-control', 'ac body');
    makeSkillDir(base, 'unrelated', 'unrelated body');

    const skills = await resolveSkills(
      { sources: [{ name: 'base', include: ['workflow'] }] },
      [new DirectorySkillSource('base', base)]
    );
    expect(skills.map((s) => s.name).sort()).toEqual(['access-control', 'security', 'workflow']);
  });

  it('never resurrects excluded skills and reports missing requires', async () => {
    const base = path.join(tmp, 'base');
    makeSkillDir(base, 'workflow', 'workflow body', undefined, ['security', 'not-shipped']);
    makeSkillDir(base, 'security', 'security body');

    const missing: Array<[string, string]> = [];
    const skills = await resolveSkills(
      { sources: [{ name: 'base', exclude: ['security'] }] },
      [new DirectorySkillSource('base', base)],
      { onMissingRequire: (skill, required) => missing.push([skill, required]) }
    );
    expect(skills.map((s) => s.name)).toEqual(['workflow']);
    expect(missing.sort()).toEqual([
      ['workflow', 'not-shipped'],
      ['workflow', 'security'],
    ]);
  });

  it('errors on unknown manifest source and missing directory', async () => {
    await expect(
      resolveSkills({ sources: [{ name: 'missing' }] }, [])
    ).rejects.toThrow(/no registered SkillSource/);
    await expect(new DirectorySkillSource('x', path.join(tmp, 'nope')).load()).rejects.toThrow(
      /not found/
    );
  });
});
