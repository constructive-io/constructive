// search_blocks without the pi wiring: where the app's registry is, how its
// index is ranked against a request, and what a hit tells the agent. The
// registry is the one the composed app installs from (`components.json`), so a
// local registry build and the published one behave the same.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type RegistryItem = {
  name: string;
  type: string;
  title?: string;
  description?: string;
  docs?: string;
  categories?: string[];
  registryDependencies?: string[];
};

export type BlockMatch = RegistryItem & { score: number };

export type AppRegistry = {
  /** The registry's index, `.../r/registry.json`. */
  indexUrl: string;
  /** The shadcn version the app was composed with. */
  shadcn: string;
  /** Blocks the app already has. */
  installed: Set<string>;
};

const FALLBACK_SHADCN = 'latest';
const FETCH_TIMEOUT_MS = 8_000;

function readJson(file: string): Record<string, unknown> | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

// The origin (scheme, host and port) of a registry URL template, or null.
function originOf(template: unknown): string | null {
  if (typeof template !== 'string') return null;
  try {
    return new URL(template.replace('{name}', 'registry')).origin;
  } catch {
    return null;
  }
}

export type AppRegistryOptions = {
  /** A registry the desktop is configured with (`CONSTRUCTIVE_REGISTRY_URL`). */
  registryUrl?: string;
};

/**
 * The registry of the app in `<cwd>/packages/app` (or of `cwd` itself when it
 * is the app). The main process fetches it, so it must be an http(s) URL on
 * the registry the app was composed from, or the configured one: an edited
 * components.json can't point the desktop at anything else.
 */
export function appRegistry(cwd: string, options: AppRegistryOptions = {}): AppRegistry {
  const appDir = [path.join(cwd, 'packages', 'app'), cwd].find((dir) =>
    existsSync(path.join(dir, 'components.json')),
  );
  if (!appDir) {
    throw new Error(
      'No packages/app/components.json in this project, so there is no blocks registry to search. A composed app gets one from plan_app.',
    );
  }
  const components = readJson(path.join(appDir, 'components.json')) ?? {};
  const template = (components.registries as Record<string, unknown> | undefined)?.[
    '@constructive'
  ];
  if (typeof template !== 'string' || !template.includes('{name}')) {
    throw new Error(
      'packages/app/components.json has no "@constructive" registry with a {name} URL template.',
    );
  }
  let index: URL;
  try {
    index = new URL(template.replace('{name}', 'registry'));
  } catch {
    throw new Error(
      `The "@constructive" registry in packages/app/components.json is not a URL: ${template}`,
    );
  }
  if (index.protocol !== 'http:' && index.protocol !== 'https:') {
    throw new Error(
      `The "@constructive" registry in packages/app/components.json must be an http or https URL, not ${index.protocol}`,
    );
  }
  const compose = readJson(path.join(appDir, '.constructive', 'compose.json')) ?? {};
  const allowed = [originOf(compose.registryUrl), originOf(options.registryUrl)].filter(
    (origin): origin is string => Boolean(origin),
  );
  if (!allowed.includes(index.origin)) {
    throw new Error(
      allowed.length
        ? `packages/app/components.json points the "@constructive" registry at ${index.origin}, but the app was composed from ${allowed.join(' or ')}. search_blocks reads only that registry.`
        : "packages/app/.constructive/compose.json records no registry, so search_blocks can't tell whether the one in components.json is the app's own. Set CONSTRUCTIVE_REGISTRY_URL, or build with the blocks already in src/components/ui.",
    );
  }
  const blocks = Array.isArray(compose.blocks) ? (compose.blocks as string[]) : [];
  return {
    indexUrl: index.href,
    shadcn: typeof compose.shadcn === 'string' ? compose.shadcn : FALLBACK_SHADCN,
    installed: new Set(blocks),
  };
}

// "Conversations" finds "conversation", "agentic" finds "agent": split on
// anything but letters and digits, drop a plural s, and let a term match the
// start of a longer one.
function terms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1)
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

const STOP = new Set([
  'a',
  'an',
  'the',
  'for',
  'and',
  'or',
  'with',
  'of',
  'to',
  'in',
  'on',
  'my',
  'our',
  'me',
  'build',
  'make',
  'app',
  'ui',
  'page',
  'screen',
  'view',
  'show',
  'list',
]);

const matches = (wanted: string, have: Set<string>) => {
  if (have.has(wanted)) return true;
  if (wanted.length < 4) return false;
  for (const t of have)
    if (t.length >= 4 && (t.startsWith(wanted) || wanted.startsWith(t))) return true;
  return false;
};

/** Registry items ranked against a request; blocks rank above primitives. */
export function rankBlocks(items: readonly RegistryItem[], query: string, limit = 6): BlockMatch[] {
  const wanted = [...new Set(terms(query).filter((t) => !STOP.has(t)))];
  if (wanted.length === 0) return [];
  const scored: BlockMatch[] = [];
  for (const item of items) {
    const fields: Array<[Set<string>, number]> = [
      [new Set(terms(item.name)), 5],
      [new Set(terms(item.title ?? '')), 3],
      [new Set(terms((item.categories ?? []).join(' '))), 2],
      [new Set(terms(`${item.description ?? ''} ${item.docs ?? ''}`)), 1],
    ];
    let score = 0;
    for (const t of wanted) {
      const hit = fields.find(([have]) => matches(t, have));
      if (hit) score += hit[1];
    }
    if (score === 0) continue;
    if (item.type === 'registry:block') score += 2;
    scored.push({ ...item, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
}

export function describeMatch(match: BlockMatch, registry: AppRegistry): string {
  const kind = match.type.replace('registry:', '');
  const about = [match.title, match.description].filter(Boolean).join('. ');
  const lines = [`- ${match.name} (${kind}): ${about}`];
  if (match.docs) lines.push(`  docs: ${match.docs.replace(/\s+/g, ' ').trim()}`);
  const deps = (match.registryDependencies ?? []).map((d) => d.replace(/^@constructive\//, ''));
  if (deps.length) lines.push(`  brings: ${deps.join(', ')}`);
  lines.push(
    registry.installed.has(match.name)
      ? '  installed already: import it from src/components/ui'
      : `  install (in packages/app): pnpm dlx shadcn@${registry.shadcn} add @constructive/${match.name}`,
  );
  return lines.join('\n');
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/** One index read per registry for the life of a session. */
export function registryIndex(fetchImpl: FetchLike = fetch as FetchLike) {
  const cache = new Map<string, Promise<RegistryItem[]>>();
  return (indexUrl: string): Promise<RegistryItem[]> => {
    const cached = cache.get(indexUrl);
    if (cached) return cached;
    const pending = (async () => {
      let res: Awaited<ReturnType<FetchLike>>;
      try {
        res = await fetchImpl(indexUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      } catch (err) {
        throw new Error(
          `The blocks registry at ${indexUrl} is unreachable (${err instanceof Error ? err.message : String(err)}). Build with the blocks already in src/components/ui until it answers.`,
        );
      }
      if (!res.ok) {
        throw new Error(
          `The blocks registry at ${indexUrl} answered HTTP ${res.status}. Build with the blocks already in src/components/ui until it answers.`,
        );
      }
      const body = (await res.json()) as { items?: RegistryItem[] };
      if (!Array.isArray(body.items)) {
        throw new Error(`${indexUrl} is not a registry index (no items).`);
      }
      return body.items;
    })();
    cache.set(indexUrl, pending);
    pending.catch(() => cache.delete(indexUrl));
    return pending;
  };
}
