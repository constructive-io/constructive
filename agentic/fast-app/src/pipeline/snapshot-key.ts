// The golden snapshot is keyed by (template SHA, registry hash): the same
// template sources composed against the same registry items give the same
// app, so a key that already exists on disk is reused as is.

import { createHash } from 'node:crypto';

export type RegistryItem = {
  name: string;
  /** The item JSON exactly as the registry served it. */
  body: string;
};

export type TemplateFile = {
  /** Path relative to the template root, with forward slashes. */
  path: string;
  content: Buffer | string;
};

const sha256 = () => createHash('sha256');

export function snapshotDirName(templateSha: string, registryHash: string): string {
  return `${templateSha.slice(0, 8)}-${registryHash.slice(0, 8)}`;
}

// Order-independent: the items are sorted by name first, and each body is
// length-prefixed so two items can never run together into the same bytes.
export function hashRegistryItems(items: readonly RegistryItem[]): string {
  const hash = sha256();
  for (const item of [...items].sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(`${item.name}\0${Buffer.byteLength(item.body)}\0`);
    hash.update(item.body);
  }
  return hash.digest('hex');
}

// A content hash of the template sources, for a local checkout where the
// working tree (not a commit) is what gets composed.
export function hashTemplateFiles(files: readonly TemplateFile[]): string {
  const hash = sha256();
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const content = typeof file.content === 'string' ? Buffer.from(file.content) : file.content;
    hash.update(`${file.path}\0${content.length}\0`);
    hash.update(content);
  }
  return hash.digest('hex');
}

/** `@constructive/resource-kit` → `resource-kit`; null for another registry or a URL. */
export function registryItemName(dependency: string, namespace = '@constructive'): string | null {
  const prefix = `${namespace}/`;
  if (!dependency.startsWith(prefix)) return null;
  const name = dependency.slice(prefix.length);
  return /^[a-z0-9][a-z0-9-]*$/.test(name) ? name : null;
}

export function itemUrl(registryUrl: string, name: string): string {
  return registryUrl.replace('{name}', name);
}

// The items a template installs plus every registry dependency they pull in
// from the same namespace, fetched once each, one at a time (a local static
// server drops parallel connections). A change anywhere in that closure
// changes the hash.
export async function collectRegistryClosure(
  roots: readonly string[],
  fetchItem: (name: string) => Promise<string>,
): Promise<RegistryItem[]> {
  const seen = new Map<string, RegistryItem>();
  const queue = [...new Set(roots)];
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    if (seen.has(name)) continue;
    const item = { name, body: await fetchItem(name) };
    seen.set(name, item);
    for (const dep of registryDependencies(item.body)) {
      if (!seen.has(dep) && !queue.includes(dep)) queue.push(dep);
    }
  }
  return [...seen.values()];
}

function registryDependencies(body: string): string[] {
  let parsed: { registryDependencies?: unknown };
  try {
    parsed = JSON.parse(body) as { registryDependencies?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.registryDependencies)) return [];
  return parsed.registryDependencies
    .map((dep) => (typeof dep === 'string' ? registryItemName(dep) : null))
    .filter((name): name is string => name !== null);
}
