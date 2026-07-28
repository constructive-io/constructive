import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as tar from 'tar';

import { fetchSkillsRelease, latestLocalRelease, resolvePin } from '../src/skills/fetch';
import { verifyIntegrity } from '../src/skills/integrity';
import { FetchLike, Packument } from '../src/skills/registry';
import { checkForSkillsUpdate } from '../src/skills/update-check';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-fetch-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function makeTarball(version: string): Promise<Buffer> {
  const pkgDir = path.join(tmp, `pkg-${version}`);
  const skillDir = path.join(pkgDir, '.agents/skills/alpha');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: alpha\ndescription: "alpha ${version}"\n---\n\nbody ${version}\n`
  );
  const file = path.join(tmp, `pkg-${version}.tgz`);
  await tar.create({ gzip: true, file, cwd: pkgDir, prefix: 'package' }, ['.agents']);
  return fs.readFileSync(file);
}

function sri(data: Buffer): string {
  return `sha512-${crypto.createHash('sha512').update(data).digest('base64')}`;
}

interface FakeRegistry {
  fetchImpl: FetchLike;
  requests: string[];
}

function fakeRegistry(
  versions: Record<string, { data: Buffer; integrity?: string }>,
  distTags: Record<string, string> = {}
): FakeRegistry {
  const requests: string[] = [];
  const packument: Packument = {
    name: '@constructive-io/skills',
    'dist-tags': { latest: Object.keys(versions).sort().pop()!, ...distTags },
    versions: Object.fromEntries(
      Object.entries(versions).map(([version, { data, integrity }]) => [
        version,
        {
          version,
          dist: { tarball: `https://reg.test/tarball/${version}`, integrity: integrity ?? sri(data) },
        },
      ])
    ),
  };
  const fetchImpl: FetchLike = async (url) => {
    requests.push(url);
    const tarballMatch = url.match(/\/tarball\/(.+)$/);
    if (tarballMatch) {
      const entry = versions[tarballMatch[1]];
      return {
        ok: !!entry,
        status: entry ? 200 : 404,
        json: async () => ({}),
        arrayBuffer: async () => {
          const buf = entry.data;
          const out = new ArrayBuffer(buf.byteLength);
          new Uint8Array(out).set(buf);
          return out;
        },
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => packument,
      arrayBuffer: async () => new ArrayBuffer(0),
    };
  };
  return { fetchImpl, requests };
}

describe('verifyIntegrity', () => {
  it('accepts matching sha512 SRI and rejects tampered data', () => {
    const data = Buffer.from('hello');
    const integrity = sri(data);
    expect(() => verifyIntegrity(data, { integrity })).not.toThrow();
    expect(() => verifyIntegrity(Buffer.from('tampered'), { integrity })).toThrow(/Integrity/);
    expect(() => verifyIntegrity(data, {})).toThrow(/no integrity metadata/);
  });
});

describe('fetchSkillsRelease', () => {
  it('downloads, verifies, and unpacks a release, then reuses it offline', async () => {
    const data = await makeTarball('1.0.0');
    const registry = fakeRegistry({ '1.0.0': { data } });
    const skillsRoot = path.join(tmp, 'skills');

    const first = await fetchSkillsRelease({
      pkg: '@constructive-io/skills',
      pin: '1.0.0',
      skillsRoot,
      fetchImpl: registry.fetchImpl,
    });
    expect(first.fromCache).toBe(false);
    expect(fs.existsSync(path.join(first.skillsDir, 'alpha/SKILL.md'))).toBe(true);

    const requestsAfterFirst = registry.requests.length;
    const second = await fetchSkillsRelease({
      pkg: '@constructive-io/skills',
      pin: '1.0.0',
      skillsRoot,
      fetchImpl: registry.fetchImpl,
    });
    expect(second.fromCache).toBe(true);
    expect(registry.requests.length).toBe(requestsAfterFirst); // no network for exact cached pin
  });

  it('resolves ranges and dist-tags', async () => {
    const v110 = await makeTarball('1.1.0');
    const v120 = await makeTarball('1.2.0');
    const registry = fakeRegistry(
      { '1.1.0': { data: v110 }, '1.2.0': { data: v120 } },
      { stable: '1.1.0' }
    );
    const skillsRoot = path.join(tmp, 'skills');

    const ranged = await fetchSkillsRelease({
      pkg: '@constructive-io/skills',
      pin: '^1.1.0',
      skillsRoot,
      fetchImpl: registry.fetchImpl,
    });
    expect(ranged.version).toBe('1.2.0');

    const tagged = await fetchSkillsRelease({
      pkg: '@constructive-io/skills',
      pin: 'stable',
      skillsRoot,
      fetchImpl: registry.fetchImpl,
    });
    expect(tagged.version).toBe('1.1.0');
  });

  it('rejects tampered tarballs and leaves nothing behind', async () => {
    const data = await makeTarball('1.0.0');
    const registry = fakeRegistry({
      '1.0.0': { data, integrity: sri(Buffer.from('other bytes')) },
    });
    const skillsRoot = path.join(tmp, 'skills');
    await expect(
      fetchSkillsRelease({
        pkg: '@constructive-io/skills',
        pin: '1.0.0',
        skillsRoot,
        fetchImpl: registry.fetchImpl,
      })
    ).rejects.toThrow(/Integrity/);
    expect(latestLocalRelease(skillsRoot)).toBeNull();
  });

  it('resolvePin errors when nothing satisfies', () => {
    const packument: Packument = { name: 'x', 'dist-tags': {}, versions: {} };
    expect(() => resolvePin(packument, '^2.0.0')).toThrow(/satisfies/);
  });

  it('latestLocalRelease returns newest downloaded version for offline fallback', async () => {
    const skillsRoot = path.join(tmp, 'skills');
    for (const version of ['1.0.0', '1.2.0', '1.10.0']) {
      const dir = path.join(skillsRoot, version, '.agents/skills/alpha');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), 'x');
    }
    expect(latestLocalRelease(skillsRoot)?.version).toBe('1.10.0');
  });
});

describe('checkForSkillsUpdate', () => {
  const versions = { '1.0.0': {}, '1.1.0': {}, '2.0.0': {} };
  const packument: Packument = {
    name: '@constructive-io/skills',
    'dist-tags': { latest: '2.0.0' },
    versions: Object.fromEntries(
      Object.keys(versions).map((v) => [v, { version: v, dist: { tarball: '' } }])
    ),
  };
  const fetchImpl: FetchLike = async () => ({
    ok: true,
    status: 200,
    json: async () => packument,
    arrayBuffer: async () => new ArrayBuffer(0),
  });

  it('reports compatible updates and harness-upgrade-required, and caches', async () => {
    const cacheFile = path.join(tmp, 'cache/update-check.json');
    const result = await checkForSkillsUpdate({
      pkg: '@constructive-io/skills',
      currentVersion: '1.0.0',
      compatibleRange: '^1.0.0',
      cacheFile,
      fetchImpl,
    });
    expect(result.latestCompatible).toBe('1.1.0');
    expect(result.updateAvailable).toBe(true);
    expect(result.harnessUpgradeRequired).toBe(true); // 2.0.0 exists outside range

    const failingFetch: FetchLike = async () => {
      throw new Error('offline');
    };
    const cached = await checkForSkillsUpdate({
      pkg: '@constructive-io/skills',
      currentVersion: '1.0.0',
      compatibleRange: '^1.0.0',
      cacheFile,
      fetchImpl: failingFetch,
    });
    expect(cached.fromCache).toBe(true);
    expect(cached.latestCompatible).toBe('1.1.0');
  });

  it('never throws with no cache and a dead registry', async () => {
    const failingFetch: FetchLike = async () => {
      throw new Error('offline');
    };
    const result = await checkForSkillsUpdate({
      pkg: '@constructive-io/skills',
      currentVersion: '1.0.0',
      cacheFile: path.join(tmp, 'none.json'),
      fetchImpl: failingFetch,
    });
    expect(result.updateAvailable).toBe(false);
  });
});
