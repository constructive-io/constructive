/**
 * The example's golden path, end to end against a mocked deploy surface:
 * build → deploy to a `play` preview → publish → edit one page → redeploy →
 * roll back.
 */

import { deployNames, deploySite, publishCommit } from '@constructive-io/site-deploy';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { buildSite } from '../src/ssg';
import { createMockServer } from './mock-server';

const CONTENT = join(__dirname, '..', 'content');
const names = deployNames();

let work: string;
let content: string;
let dist: string;

beforeEach(async () => {
  work = await mkdtemp(join(tmpdir(), 'ssg-deploy-'));
  content = join(work, 'content');
  dist = join(work, 'dist');
  await copyContent(CONTENT, content);
});

afterEach(async () => {
  await rm(work, { recursive: true, force: true });
});

async function copyContent(from: string, to: string): Promise<void> {
  const { cp } = await import('fs/promises');
  await cp(from, to, { recursive: true });
}

const deployOptions = (server: ReturnType<typeof createMockServer>) => ({
  api: server.api,
  putObject: server.putObject,
  siteId: 'site-1',
  databaseId: 'db-1',
  bucketKey: 'site-example',
  source: dist,
});

test('builds every page, the stylesheet and a 404', async () => {
  const files = await buildSite(content, dist);
  expect(files).toEqual([
    '404.html',
    'about.html',
    'assets/site.css',
    'index.html',
    'previews.html',
  ]);
  const index = await readFile(join(dist, 'index.html'), 'utf8');
  expect(index).toContain('<title>Constructive SSG example</title>');
  // The nav links every page, with index at the site root.
  expect(index).toContain('href="/"');
  expect(index).toContain('href="/previews.html"');
});

test('deploys the build to a play preview without touching production', async () => {
  const server = createMockServer();
  await buildSite(content, dist);

  const result = await deploySite({
    ...deployOptions(server),
    preview: 'play',
    previewApex: 'preview.example.com',
  });

  expect(result.files).toBe(5);
  expect(result.uploaded).toBe(5);
  expect(result.skipped).toBe(0);
  expect(result.commitId).toBe('commit-1');
  expect(result.previewUrl).toBe('https://play--example.preview.example.com');
  expect(server.previewRefs).toEqual({ play: 'commit-1' });
  // Production is still unpublished: a preview deploy moves no pointer.
  expect(result.published).toBe(false);
  expect(server.activeCommitId).toBeNull();

  // Bytes are addressed by content, and the manifest carries served types.
  expect(server.storedKeys).toHaveLength(5);
  for (const key of server.storedKeys) expect(key).toMatch(/^cas\/sha256\/[0-9a-f]{64}$/);
  expect(result.manifest.files['assets/site.css'].content_type).toBe('text/css; charset=utf-8');
  expect(result.manifest.files['index.html'].content_type).toBe('text/html; charset=utf-8');
});

test('publishing the previewed commit is the same pointer move', async () => {
  const server = createMockServer();
  await buildSite(content, dist);

  const first = await deploySite({ ...deployOptions(server), preview: 'play' });
  expect(server.activeCommitId).toBeNull();

  await publishCommit(server.api, names, 'site-1', first.commitId);
  expect(server.activeCommitId).toBe(first.commitId);
});

test('editing one page re-uploads one file and leaves production behind', async () => {
  const server = createMockServer();
  await buildSite(content, dist);
  const first = await deploySite({ ...deployOptions(server), publish: true });
  expect(server.activeCommitId).toBe(first.commitId);

  await writeFile(join(content, 'about.html'), '# About\n<p>Now with a changelog.</p>\n');
  await buildSite(content, dist);

  const second = await deploySite({ ...deployOptions(server), preview: 'play' });

  expect(second.commitId).not.toBe(first.commitId);
  expect(second.uploaded).toBe(1);
  expect(second.skipped).toBe(4);
  expect(second.manifest.files['about.html'].hash).not.toBe(
    first.manifest.files['about.html'].hash,
  );
  expect(second.manifest.files['index.html'].hash).toBe(first.manifest.files['index.html'].hash);
  // The preview moved; production stayed on the first release.
  expect(server.previewRefs.play).toBe(second.commitId);
  expect(server.activeCommitId).toBe(first.commitId);

  // Publishing then rolling back is one mutation each way.
  await publishCommit(server.api, names, 'site-1', second.commitId);
  expect(server.activeCommitId).toBe(second.commitId);
  await publishCommit(server.api, names, 'site-1', first.commitId);
  expect(server.activeCommitId).toBe(first.commitId);
});

test('redeploying an unchanged build writes no new release', async () => {
  const server = createMockServer();
  await buildSite(content, dist);
  const first = await deploySite({ ...deployOptions(server), publish: true });

  await buildSite(content, dist);
  const again = await deploySite({ ...deployOptions(server), skipIfUnchanged: true });

  expect(again.unchanged).toBe(true);
  expect(again.commitId).toBe(first.commitId);
  expect(again.uploaded).toBe(0);
});
