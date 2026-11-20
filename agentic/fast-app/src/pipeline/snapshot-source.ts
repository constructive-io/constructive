// Where the golden snapshot's template comes from, and its key. The host says
// where, as a SourceEnv (desktop: fast-app-desktop/template-env.ts).
//
// Development: a local sandbox-templates checkout (`templateDir`) composed
// against a local registry build (`registryUrl`). The template SHA is a
// content hash of the working tree, so an uncommitted edit gives a new
// snapshot.
//
// Production: a pinned commit of sandbox-templates, fetched once as a tarball
// of only the directories the compose step reads, composed against the blocks
// registry pinned at one commit of its `registry-dist` branch. Compose writes
// that URL into the app's components.json, so a blocks change on GitHub Pages
// never reaches a packaged build's apps.

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { runCommand } from './command';
import {
  collectRegistryClosure,
  hashRegistryItems,
  hashTemplateFiles,
  itemUrl,
  snapshotDirName,
  type TemplateFile,
} from './snapshot-key';

export const TEMPLATE_NAME = 'nextjs/app';

// The pinned template commit for packaged builds: the merge of the lean
// template into the sandbox-templates default branch. With no pin, a packaged
// build reports the snapshot as unavailable instead of composing an unpinned HEAD.
export const TEMPLATE_PIN: { repo: string; sha: string | null } = {
  repo: 'constructive-io/sandbox-templates',
  sha: '2564a820c34164c11e178eb8b87ee5d6f5e3ccd0',
};

// The pinned blocks registry for packaged builds: the built `r/` of the
// `registry-dist` commit made from the blocks merge the template pin uses.
// With no pin, a packaged build is off, as with no template pin.
export const REGISTRY_PIN: { url: string | null } = {
  url: 'https://raw.githubusercontent.com/constructive-io/blocks/68e6644aaa8fa5d0e0613bd7134ea42ccd55f460/r/{name}.json',
};

const TEMPLATE_DIRS = ['shared', 'nextjs/app', 'scripts'];
// Compose leaves tests and build output out of the app, so they don't key it.
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  '.git',
  'dist',
  'coverage',
  '__tests__',
  '.DS_Store',
]);

export type TemplateManifest = {
  name?: string;
  layers?: string[];
  registry?: Record<string, string>;
  blocks?: string[];
};

export type TemplateSource = {
  /** The sandbox-templates root that `scripts/compose.ts` runs from. */
  root: string;
  templateSha: string;
  registryUrl: string;
  manifest: TemplateManifest;
};

export type ResolvedSource = TemplateSource & { registryHash: string; key: string };

/** The host's template source: a checkout, a registry and a template commit, each optional. */
export type SourceEnv = { templateDir?: string; registryUrl?: string; templateSha?: string };

async function readManifest(root: string): Promise<TemplateManifest> {
  const file = path.join(root, TEMPLATE_NAME, 'template.json');
  return JSON.parse(await readFile(file, 'utf8')) as TemplateManifest;
}

async function listFiles(root: string, rel: string, out: TemplateFile[]): Promise<void> {
  const dir = path.join(root, rel);
  if (!existsSync(dir)) return;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await listFiles(root, child, out);
    else if (entry.isFile())
      out.push({ path: child, content: await readFile(path.join(root, child)) });
  }
}

export async function hashTemplateTree(root: string, manifest: TemplateManifest): Promise<string> {
  const dirs = new Set([...TEMPLATE_DIRS, ...(manifest.layers ?? [])]);
  const files: TemplateFile[] = [];
  for (const dir of dirs) await listFiles(root, dir, files);
  return hashTemplateFiles(files);
}

// Fetches the pinned commit's tarball and keeps only the template dirs.
async function fetchPinnedTemplate(cacheDir: string, sha: string, signal?: AbortSignal) {
  const root = path.join(cacheDir, 'sources', sha);
  if (existsSync(path.join(root, TEMPLATE_NAME, 'template.json'))) return root;
  const tmp = `${root}.tmp-${process.pid}`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const url = `https://codeload.github.com/${TEMPLATE_PIN.repo}/tar.gz/${sha}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Template download failed: HTTP ${response.status} (${url})`);
  const archive = path.join(tmp, 'template.tar.gz');
  await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  const patterns = TEMPLATE_DIRS.map((dir) => `*/${dir}`);
  const result = await runCommand(
    'tar',
    ['-xzf', archive, '--strip-components=1', '-C', tmp, ...patterns],
    { cwd: tmp, signal },
  );
  if (!result.ok) throw new Error(`Template extract failed: ${result.output.slice(-500)}`);
  await rm(archive, { force: true });
  await rm(root, { recursive: true, force: true });
  await rename(tmp, root);
  return root;
}

/**
 * Whether this build has an app template to compose: a local checkout
 * (development), or a template commit (an explicit SHA, else the release pin)
 * with a registry to compose it against (an explicit URL, else the release
 * pin). A packaged build without both pins has none, and app building is off
 * rather than failing on every project.
 */
export function templateAvailable(env: SourceEnv): boolean {
  if (env.templateDir) return true;
  return Boolean((env.templateSha ?? TEMPLATE_PIN.sha) && (env.registryUrl ?? REGISTRY_PIN.url));
}

export async function resolveTemplateSource(
  cacheDir: string,
  env: SourceEnv,
  signal?: AbortSignal,
): Promise<TemplateSource> {
  let root: string;
  let templateSha: string;
  if (env.templateDir) {
    root = env.templateDir;
    const manifest = await readManifest(root);
    templateSha = env.templateSha ?? (await hashTemplateTree(root, manifest));
    return { root, templateSha, manifest, registryUrl: registryUrlFor(manifest, env) };
  }
  const sha = env.templateSha ?? TEMPLATE_PIN.sha;
  if (!sha) {
    throw new Error(
      'No app template is configured: set CONSTRUCTIVE_TEMPLATE_DIR to a sandbox-templates checkout.',
    );
  }
  root = await fetchPinnedTemplate(cacheDir, sha, signal);
  templateSha = sha;
  const manifest = await readManifest(root);
  // Never the template's own registry, which is the live one.
  const pinned = env.registryUrl ?? REGISTRY_PIN.url;
  if (!pinned) throw new Error('No blocks registry is pinned for this build.');
  return { root, templateSha, manifest, registryUrl: checkedRegistryUrl(pinned) };
}

function registryUrlFor(manifest: TemplateManifest, env: SourceEnv): string {
  return checkedRegistryUrl(env.registryUrl ?? manifest.registry?.['@constructive']);
}

function checkedRegistryUrl(url: string | undefined): string {
  if (!url || !url.includes('{name}')) {
    throw new Error('There is no @constructive registry URL with a {name} placeholder.');
  }
  return url;
}

export async function resolveSnapshotKey(
  source: TemplateSource,
  signal?: AbortSignal,
): Promise<ResolvedSource> {
  const fetchOnce = async (url: string) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} (${url})`);
    return response.text();
  };
  const items = await collectRegistryClosure(source.manifest.blocks ?? [], async (name) => {
    const url = itemUrl(source.registryUrl, name);
    return fetchOnce(url).catch(async (err: Error) => {
      if (signal?.aborted || /^HTTP 4/.test(err.message))
        throw new Error(`Registry item ${name}: ${err.message}`);
      return fetchOnce(url);
    });
  });
  const registryHash = hashRegistryItems(items);
  return { ...source, registryHash, key: snapshotDirName(source.templateSha, registryHash) };
}
