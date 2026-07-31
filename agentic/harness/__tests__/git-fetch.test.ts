import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as tar from 'tar';

import { fetchSkillsFromGit, listGitTagVersions } from '../src/skills/git-fetch';
import { FetchLike } from '../src/skills/registry';
import { checkForSkillsUpdateFromGit } from '../src/skills/update-check';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-git-fetch-'));
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
  // codeload tarballs have a single `<repo>-<ref>/` top-level dir.
  await tar.create({ gzip: true, file, cwd: repoDir, prefix: `skills-${label}` }, ['.agents']);
  return fs.readFileSync(file);
}

interface FakeGitHub {
  fetchImpl: FetchLike;
  requests: string[];
}

function fakeGitHub(
  tags: Record<string, { sha: string; data: Buffer }>,
  branches: Record<string, { sha: string; data: Buffer }> = {}
): FakeGitHub {
  const requests: string[] = [];
  const bySha = new Map<string, Buffer>();
  for (const { sha, data } of [...Object.values(tags), ...Object.values(branches)]) {
    bySha.set(sha, data);
  }
  const fetchImpl: FetchLike = async (url) => {
    requests.push(url);
    const ok = (body: unknown, data?: Buffer) => ({
      ok: true,
      status: 200,
      json: async () => body,
      arrayBuffer: async () => {
        const buf = data ?? Buffer.alloc(0);
        const out = new ArrayBuffer(buf.byteLength);
        new Uint8Array(out).set(buf);
        return out;
      },
    });
    const notFound = { ok: false, status: 404, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };

    if (url.includes('/tags')) {
      return ok(Object.entries(tags).map(([name, { sha }]) => ({ name, commit: { sha } })));
    }
    const commitMatch = url.match(/\/commits\/([^/?]+)$/);
    if (commitMatch) {
      const branch = branches[decodeURIComponent(commitMatch[1])];
      return branch ? ok({ sha: branch.sha }) : notFound;
    }
    const tarMatch = url.match(/\/tar\.gz\/(.+)$/);
    if (tarMatch) {
      const ref = decodeURIComponent(tarMatch[1]);
      const data = tags[ref]?.data ?? bySha.get(ref);
      return data ? ok({}, data) : notFound;
    }
    return notFound;
  };
  return { fetchImpl, requests };
}

describe('fetchSkillsFromGit', () => {
  it('resolves a semver range against tags, unpacks, and reuses the cache', async () => {
    const v1 = await makeRepoTarball('1.0.0');
    const v11 = await makeRepoTarball('1.1.0');
    const gh = fakeGitHub({
      'v1.0.0': { sha: 'a'.repeat(40), data: v1 },
      'v1.1.0': { sha: 'b'.repeat(40), data: v11 },
    });
    const skillsRoot = path.join(tmp, 'skills');

    const fetched = await fetchSkillsFromGit({
      repo: 'constructive-io/constructive-skills',
      pin: '^1.0.0',
      skillsRoot,
      fetchImpl: gh.fetchImpl,
    });
    expect(fetched.version).toBe('1.1.0');
    expect(fetched.fromCache).toBe(false);
    expect(fs.readFileSync(path.join(fetched.skillsDir, 'alpha', 'SKILL.md'), 'utf8')).toContain(
      'body 1.1.0'
    );

    // Exact pin of a downloaded version is served from disk, no network.
    const before = gh.requests.length;
    const cached = await fetchSkillsFromGit({
      repo: 'constructive-io/constructive-skills',
      pin: '1.1.0',
      skillsRoot,
      fetchImpl: gh.fetchImpl,
    });
    expect(cached.fromCache).toBe(true);
    expect(gh.requests.length).toBe(before);
  });

  it('resolves a branch pin to its head SHA', async () => {
    const data = await makeRepoTarball('main');
    const sha = 'c'.repeat(40);
    const gh = fakeGitHub({}, { main: { sha, data } });

    const fetched = await fetchSkillsFromGit({
      repo: 'constructive-io/constructive-skills',
      pin: 'main',
      skillsRoot: path.join(tmp, 'skills'),
      fetchImpl: gh.fetchImpl,
    });
    expect(fetched.version).toBe(sha);
    expect(fs.existsSync(path.join(fetched.skillsDir, 'alpha', 'SKILL.md'))).toBe(true);
  });

  it('errors when the repo tarball has no skills directory', async () => {
    const repoDir = path.join(tmp, 'empty-repo');
    fs.mkdirSync(repoDir, { recursive: true });
    fs.writeFileSync(path.join(repoDir, 'README.md'), 'no skills');
    const file = path.join(tmp, 'empty.tgz');
    await tar.create({ gzip: true, file, cwd: repoDir, prefix: 'skills-x' }, ['README.md']);
    const gh = fakeGitHub({ 'v1.0.0': { sha: 'd'.repeat(40), data: fs.readFileSync(file) } });

    await expect(
      fetchSkillsFromGit({
        repo: 'o/r',
        pin: 'v1.0.0',
        skillsRoot: path.join(tmp, 'skills'),
        fetchImpl: gh.fetchImpl,
      })
    ).rejects.toThrow(/no \.agents\/skills/);
  });
});

describe('git update check', () => {
  it('lists tag versions and reports compatible updates with caching', async () => {
    const gh = fakeGitHub({
      'v1.0.0': { sha: 'a'.repeat(40), data: Buffer.alloc(0) },
      'v1.2.0': { sha: 'b'.repeat(40), data: Buffer.alloc(0) },
      'v2.0.0': { sha: 'c'.repeat(40), data: Buffer.alloc(0) },
      'not-a-version': { sha: 'd'.repeat(40), data: Buffer.alloc(0) },
    });
    expect(await listGitTagVersions({ repo: 'o/r', fetchImpl: gh.fetchImpl })).toEqual([
      '1.0.0',
      '1.2.0',
      '2.0.0',
    ]);

    const cacheFile = path.join(tmp, 'update-check.json');
    const result = await checkForSkillsUpdateFromGit({
      repo: 'o/r',
      currentVersion: '1.0.0',
      compatibleRange: '^1.0.0',
      cacheFile,
      fetchImpl: gh.fetchImpl,
    });
    expect(result.latestVersion).toBe('2.0.0');
    expect(result.latestCompatible).toBe('1.2.0');
    expect(result.updateAvailable).toBe(true);
    expect(result.harnessUpgradeRequired).toBe(true);

    const before = gh.requests.length;
    const cached = await checkForSkillsUpdateFromGit({
      repo: 'o/r',
      currentVersion: '1.0.0',
      compatibleRange: '^1.0.0',
      cacheFile,
      fetchImpl: gh.fetchImpl,
    });
    expect(cached.fromCache).toBe(true);
    expect(gh.requests.length).toBe(before);
  });
});
