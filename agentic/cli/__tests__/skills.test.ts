import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadConfig } from '../src/config';
import { assembleSkills } from '../src/skills';

const writeSkill = (root: string, name: string, body: string) => {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${body}\n---\n\n${body}\n`
  );
};

/**
 * The base layer is fetched over HTTP, and these cases are about what assembly
 * does when it cannot be had — so the fetch is refused here rather than left to
 * reach api.github.com, where a slow lookup read as a test timeout.
 */
const offline = () => Promise.reject(new Error('offline: no network in this test'));

describe('agent skills assembly', () => {
  let home: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
  });

  afterEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('creates the overlay dir and works with no base release (offline, nothing cached)', async () => {
    const config = loadConfig(home);
    config.skillsRepo = 'example/does-not-exist';
    config.skillsPin = 'v0.0.0';
    config.skillsFetch = offline;
    const resolved = await assembleSkills(config);
    expect(fs.existsSync(config.overlayDir)).toBe(true);
    expect(resolved).toEqual([]);
  });

  it('overlay skills win over a cached base release wholesale', async () => {
    const config = loadConfig(home);
    config.skillsRepo = 'example/does-not-exist';
    config.skillsPin = 'v9.9.9';
    config.skillsFetch = offline;
    // Seed a fake cached release so the offline fallback picks it up.
    const releaseDir = path.join(config.dirs.skillsRoot, '9.9.9', '.agents', 'skills');
    writeSkill(releaseDir, 'alpha', 'base alpha');
    writeSkill(releaseDir, 'beta', 'base beta');
    writeSkill(config.overlayDir, 'beta', 'overlay beta');

    const resolved = await assembleSkills(config);
    const byName = Object.fromEntries(resolved.map((s) => [s.name, s]));
    expect(Object.keys(byName).sort()).toEqual(['alpha', 'beta']);
    expect(byName.beta.sourceName).toBe('local-overlay');

    const materialized = fs.readFileSync(
      path.join(config.agentDir, 'skills', 'beta', 'SKILL.md'),
      'utf8'
    );
    expect(materialized).toContain('overlay beta');
  });
});
