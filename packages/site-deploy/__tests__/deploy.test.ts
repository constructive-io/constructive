import { deploySite } from '../src/deploy';
import type { DeployProgress } from '../src/types';
import { DeployError } from '../src/types';
import { createMockServer, failingPut, file, hashOf, keyOf } from './mock-api';

const base = {
  siteId: 'site-1',
  databaseId: 'db-1',
  bucketKey: 'site-docs',
};

const build = [file('index.html', '<h1>home</h1>'), file('assets/app.js', 'console.log(1)')];

describe('deploySite', () => {
  it('hashes the build, uploads the bytes and commits one manifest', async () => {
    const server = createMockServer();
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
    });

    expect(result).toMatchObject({
      commitId: 'commit-1',
      storeId: 'store-1',
      files: 2,
      uploaded: 2,
      skipped: 0,
      published: false,
      unchanged: false,
    });
    expect(result.manifest.files['index.html']).toEqual({
      hash: hashOf('<h1>home</h1>'),
      content_type: 'text/html; charset=utf-8',
      size: 13,
    });
    expect(server.puts).toHaveLength(2);
    expect(server.countOf('createSiteRelease')).toBe(1);
    expect(server.countOf('updateSiteRelease')).toBe(0);
  });

  it('registers the bytes under content-addressed keys', async () => {
    const server = createMockServer();
    await deploySite({ ...base, api: server.api, putObject: server.putObject, source: build });

    const upload = server.firstCall('uploadFiles') as any;
    expect(upload.input.bucketKey).toBe('site-docs');
    expect(upload.input.files.map((f: any) => f.key)).toEqual([
      keyOf('<h1>home</h1>'),
      keyOf('console.log(1)'),
    ]);
  });

  it('patches the existing row on later deploys instead of creating a second one', async () => {
    const server = createMockServer({
      release: {
        id: 'release-1',
        commitId: 'commit-0',
        storeId: 'store-1',
        manifest: { files: {}, file_count: 0, total_bytes: 0 },
      },
    });
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
    });

    expect(server.countOf('createSiteRelease')).toBe(0);
    expect(server.countOf('updateSiteRelease')).toBe(1);
    expect(result.releaseId).toBe('release-1');
    // The trigger stamps a new commit on every manifest write.
    expect(result.commitId).toBe('commit-1');
  });

  it('requires a databaseId only for the first deploy', async () => {
    const server = createMockServer();
    await expect(
      deploySite({
        ...base,
        databaseId: undefined,
        api: server.api,
        putObject: server.putObject,
        source: build,
      }),
    ).rejects.toMatchObject({ code: 'MISSING_DATABASE_ID' });
    expect(server.countOf('createSiteRelease')).toBe(0);
  });

  it('skips bytes the server already has', async () => {
    const server = createMockServer({ existing: [hashOf('<h1>home</h1>')] });
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
    });

    expect(result).toMatchObject({ files: 2, uploaded: 1, skipped: 1 });
    expect(server.puts).toHaveLength(1);
    expect(server.puts[0].url).toContain(hashOf('console.log(1)'));
  });

  it('re-uploads only the changed file when one file changes', async () => {
    const server = createMockServer();
    await deploySite({ ...base, api: server.api, putObject: server.putObject, source: build });
    const afterFirst = server.puts.length;

    const changed = [file('index.html', '<h1>home v2</h1>'), build[1]];
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: changed,
    });

    expect(afterFirst).toBe(2);
    expect(result).toMatchObject({ uploaded: 1, skipped: 1 });
    expect(server.puts[2].url).toContain(hashOf('<h1>home v2</h1>'));
  });

  it('splits registration into batches the server will accept', async () => {
    const server = createMockServer();
    const many = Array.from({ length: 25 }, (_, i) => file(`page-${i}.html`, `page ${i}`));
    await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: many,
      batchSize: 10,
    });

    expect(server.countOf('uploadFiles')).toBe(3);
    expect(server.puts).toHaveLength(25);
  });

  it('publishes by moving the site pointer, after the manifest lands', async () => {
    const server = createMockServer();
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
      publish: true,
    });

    expect(result.published).toBe(true);
    expect(server.activeCommitId).toBe(result.commitId);
    expect(server.calls.map((c) => c.operation)).toEqual([
      'siteReleases',
      'uploadFiles',
      'createSiteRelease',
      'updateSite',
    ]);
  });

  it('points a preview ref at the new commit and returns its hostname', async () => {
    const server = createMockServer();
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
      preview: 'pr-42',
      previewApex: 'preview.test',
    });

    expect(server.previewRefs['pr-42']).toBe(result.commitId);
    expect(result.previewUrl).toBe('https://pr-42--docs.preview.test');
    expect(result.published).toBe(false);
  });

  it('moves an existing ref without provisioning when no apex is given', async () => {
    const server = createMockServer();
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
      preview: 'staging',
    });

    expect(server.countOf('setSitePreview')).toBe(1);
    expect(server.countOf('provisionSitePreview')).toBe(0);
    expect(result.previewUrl).toBeNull();
  });

  it('rejects a preview name that cannot be a hostname label', async () => {
    const server = createMockServer();
    await expect(
      deploySite({
        ...base,
        api: server.api,
        putObject: server.putObject,
        source: build,
        preview: 'Feature/One',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PREVIEW_NAME' });
    expect(server.calls).toHaveLength(0);
  });

  it('never writes a manifest after an upload failure', async () => {
    const server = createMockServer();
    await expect(
      deploySite({ ...base, api: server.api, putObject: failingPut, source: build, retries: 0 }),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });

    expect(server.countOf('createSiteRelease')).toBe(0);
    expect(server.release).toBeNull();
    expect(server.activeCommitId).toBeNull();
  });

  it('retries a transient upload failure before giving up', async () => {
    const server = createMockServer();
    let attempts = 0;
    const flaky = async (url: string, body: Uint8Array, contentType: string) => {
      attempts += 1;
      if (attempts === 1) throw new Error('502 bad gateway');
      await server.putObject(url, body, contentType);
    };

    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: flaky,
      source: [build[0]],
      retries: 2,
    });

    expect(attempts).toBe(2);
    expect(result.uploaded).toBe(1);
  });

  it('fails before uploading when the server returns a non-CAS key', async () => {
    const server = createMockServer({ corruptKeyFor: 'index.html' });
    await expect(
      deploySite({ ...base, api: server.api, putObject: server.putObject, source: build }),
    ).rejects.toMatchObject({ code: 'KEY_MISMATCH' });

    expect(server.puts).toHaveLength(0);
    expect(server.countOf('createSiteRelease')).toBe(0);
  });

  it('leaves the release usable when publishing fails', async () => {
    const server = createMockServer({ failOn: { updateSite: new Error('permission denied') } });
    await expect(
      deploySite({
        ...base,
        api: server.api,
        putObject: server.putObject,
        source: build,
        publish: true,
      }),
    ).rejects.toMatchObject({ code: 'PUBLISH_FAILED' });

    // The commit exists and can be published on a retry.
    expect(server.release?.commitId).toBe('commit-1');
    expect(server.activeCommitId).toBeNull();
  });

  it('surfaces a release row that came back without versioning', async () => {
    const server = createMockServer();
    const api = async (query: string, variables: Record<string, unknown>) => {
      const data = await server.api(query, variables);
      if (data.createSiteRelease) {
        return { createSiteRelease: { siteRelease: { id: 'release-1' } } };
      }
      return data;
    };

    await expect(
      deploySite({ ...base, api, putObject: server.putObject, source: build }),
    ).rejects.toMatchObject({ code: 'RELEASE_NOT_VERSIONED' });
  });

  it('reuses the live release when nothing changed and skipIfUnchanged is set', async () => {
    const server = createMockServer();
    const first = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
    });

    const second = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
      skipIfUnchanged: true,
    });

    expect(second).toMatchObject({
      commitId: first.commitId,
      unchanged: true,
      uploaded: 0,
      skipped: 2,
    });
    expect(server.countOf('updateSiteRelease')).toBe(0);
    expect(server.countOf('uploadFiles')).toBe(1);
  });

  it('commits again when the tree changed even with skipIfUnchanged', async () => {
    const server = createMockServer();
    await deploySite({ ...base, api: server.api, putObject: server.putObject, source: build });
    const second = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: [file('index.html', 'changed'), build[1]],
      skipIfUnchanged: true,
    });

    expect(second.unchanged).toBe(false);
    expect(second.commitId).toBe('commit-2');
  });

  it('writes nothing on a dry run', async () => {
    const server = createMockServer();
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
      dryRun: true,
    });

    expect(result.files).toBe(2);
    expect(server.puts).toHaveLength(0);
    expect(server.release).toBeNull();
  });

  it('skips ignored paths', async () => {
    const server = createMockServer();
    const result = await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: [...build, file('stats.json', '{}')],
      ignore: (path) => path === 'stats.json',
    });

    expect(Object.keys(result.manifest.files)).toEqual(['index.html', 'assets/app.js']);
  });

  it('emits progress for every stage', async () => {
    const server = createMockServer();
    const events: DeployProgress[] = [];
    await deploySite({
      ...base,
      api: server.api,
      putObject: server.putObject,
      source: build,
      publish: true,
      preview: 'pr-42',
      previewApex: 'preview.test',
      onProgress: (event) => events.push(event),
    });

    expect(events.map((event) => event.type)).toEqual([
      'hashed',
      'hashed',
      'diffed',
      'uploaded',
      'uploaded',
      'manifest',
      'preview',
      'published',
    ]);
  });

  it('stops when the caller aborts', async () => {
    const server = createMockServer();
    const controller = new AbortController();
    controller.abort();

    await expect(
      deploySite({
        ...base,
        api: server.api,
        putObject: server.putObject,
        source: build,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(DeployError);
    expect(server.calls).toHaveLength(0);
  });

  it('talks to the platform surface when asked', async () => {
    const server = createMockServer();
    const seen: string[] = [];
    const api = async (query: string) => {
      seen.push(query);
      throw new Error('stop');
    };

    await expect(
      deploySite({
        ...base,
        api,
        putObject: server.putObject,
        source: build,
        scope: 'platform',
      }),
    ).rejects.toThrow('stop');
    expect(seen[0]).toContain('platformSiteReleases');
  });
});
