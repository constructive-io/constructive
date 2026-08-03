import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as tar from 'tar';

import {
  DEFAULT_SKILLS_PIN,
  DEFAULT_SKILLS_REPO,
  DEFAULT_SKILLS_SOURCE_NAME,
  defaultSkillLayer,
  fetchDefaultSkills,
  latestLocalAnyRelease,
} from '../src/skills/default-source';
import { FetchLike } from '../src/skills/registry';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-default-source-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function makeRepoTarball(label: string): Promise<Buffer> {
  const repoDir = path.join(tmp, `repo-${label}`);
  const skillDir = path.join(repoDir, '.agents/skills/alpha');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: alpha\ndescription: "alpha ${label}"\n---\n\nbody ${label}\n`
  );
  const file = path.join(tmp, `repo-${label}.tgz`);
  await tar.create({ gzip: true, file, cwd: repoDir, prefix: `skills-${label}` }, ['.agents']);
  return fs.readFileSync(file);
}

function makeLocalRelease(skillsRoot: string, version: string, body: string): void {
  const dir = path.join(skillsRoot, version, '.agents/skills/alpha');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), body);
}

const offline: FetchLike = async () => {
  throw new Error('network unreachable');
};

describe('fetchDefaultSkills', () => {
  it('fetches DEFAULT_SKILLS_REPO at branch head', async () => {
    const data = await makeRepoTarball('main');
    const sha = 'd'.repeat(40);
    const requests: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      requests.push(url);
      if (url.includes('/commits/')) {
        return { ok: true, status: 200, json: async () => ({ sha }), arrayBuffer: async () => new ArrayBuffer(0) };
      }
      if (url.includes('/tar.gz/')) {
        const out = new ArrayBuffer(data.byteLength);
        new Uint8Array(out).set(data);
        return { ok: true, status: 200, json: async () => ({}), arrayBuffer: async () => out };
      }
      return { ok: true, status: 200, json: async () => [], arrayBuffer: async () => new ArrayBuffer(0) };
    };

    const fetched = await fetchDefaultSkills({
      skillsRoot: path.join(tmp, 'skills'),
      fetchImpl,
    });
    expect(fetched.version).toBe(sha);
    expect(fs.existsSync(path.join(fetched.skillsDir, 'alpha', 'SKILL.md'))).toBe(true);
    expect(requests.some((u) => u.includes(DEFAULT_SKILLS_REPO))).toBe(true);
    expect(requests.some((u) => u.includes(`/commits/${DEFAULT_SKILLS_PIN}`))).toBe(true);
  });

  it('falls back to a cached branch-head (SHA-named) release when offline', async () => {
    const skillsRoot = path.join(tmp, 'skills');
    makeLocalRelease(skillsRoot, 'e'.repeat(40), 'cached head');

    const fetched = await fetchDefaultSkills({ skillsRoot, fetchImpl: offline });
    expect(fetched.fromCache).toBe(true);
    expect(fetched.version).toBe('e'.repeat(40));
    expect(fs.readFileSync(path.join(fetched.skillsDir, 'alpha', 'SKILL.md'), 'utf8')).toBe(
      'cached head'
    );
  });

  it('throws when offline with nothing cached', async () => {
    await expect(
      fetchDefaultSkills({ skillsRoot: path.join(tmp, 'skills'), fetchImpl: offline })
    ).rejects.toThrow('network unreachable');
  });
});

describe('latestLocalAnyRelease', () => {
  it('prefers tagged (semver) releases over SHA directories', () => {
    const skillsRoot = path.join(tmp, 'skills');
    makeLocalRelease(skillsRoot, 'f'.repeat(40), 'sha release');
    makeLocalRelease(skillsRoot, '1.2.0', 'tagged release');

    const release = latestLocalAnyRelease(skillsRoot);
    expect(release?.version).toBe('1.2.0');
  });

  it('picks the newest SHA directory by mtime when no tags exist', () => {
    const skillsRoot = path.join(tmp, 'skills');
    makeLocalRelease(skillsRoot, 'a'.repeat(40), 'older');
    makeLocalRelease(skillsRoot, 'b'.repeat(40), 'newer');
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(path.join(skillsRoot, 'a'.repeat(40)), past, past);

    const release = latestLocalAnyRelease(skillsRoot);
    expect(release?.version).toBe('b'.repeat(40));
  });

  it('returns null for a missing or empty root', () => {
    expect(latestLocalAnyRelease(path.join(tmp, 'nope'))).toBeNull();
  });
});

describe('defaultSkillLayer', () => {
  it('names the default layer', () => {
    expect(defaultSkillLayer()).toEqual({ name: DEFAULT_SKILLS_SOURCE_NAME });
  });
});
