// The golden snapshot: the app template composed once per (template SHA,
// registry hash) into `<stash>/templates/<sha8>-<hash8>/app`, then cloned into
// each new project before the model starts. A failed rebuild keeps the last
// good snapshot in use.

import { type Dirent, existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { APP_SPEC_SCHEMA_FILE, TEMPLATE_SPEC_SCHEMA_FILE } from '../app-spec/validate';
import { outputTail, runCommand } from './command';
import { appDirOf, cloneApp, isComposed } from './snapshot-clone';
import {
  type ResolvedSource,
  resolveSnapshotKey,
  resolveTemplateSource,
  type SourceEnv,
  TEMPLATE_NAME,
  templateAvailable,
} from './snapshot-source';

export type Snapshot = {
  key: string;
  /** The composed app, ready to clone. */
  appDir: string;
  templateSha: string;
  registryHash: string;
  registryUrl: string;
  composedAt: string;
};

type Install = { promise: Promise<void>; abort: AbortController; done: boolean };

const CURRENT_FILE = 'current.json';
const COMPOSE_TIMEOUT_MS = 10 * 60_000;
const KEEP_SNAPSHOTS = 2;

/**
 * This run's check of the snapshot against the current sources: `checked` once
 * it found or composed theirs; `kept` when it couldn't reach them and the last
 * good snapshot stands, so each clone checks again in the background.
 */
type CheckState = 'unchecked' | 'checked' | 'kept';

export class SnapshotManager {
  private current: Snapshot | null = null;
  private inflight: Promise<Snapshot> | null = null;
  /** The read of the last good snapshot, once: a second caller waits for the same read. */
  private loading: Promise<void> | null = null;
  private checkState: CheckState = 'unchecked';
  private installs = new Map<string, Install>();

  readonly templatesDir: string;
  private readonly env: () => SourceEnv;
  private readonly resolveSource: (templatesDir: string) => Promise<ResolvedSource>;

  constructor(
    templatesDir: string,
    source: {
      /** Where the host says the template comes from, read each time it is needed. */
      env: () => SourceEnv;
      /** The current template and registry, keyed; tests replace the network lookup. */
      resolve?: (templatesDir: string) => Promise<ResolvedSource>;
    },
  ) {
    this.templatesDir = templatesDir;
    this.env = source.env;
    this.resolveSource =
      source.resolve ??
      (async (dir) => resolveSnapshotKey(await resolveTemplateSource(dir, this.env())));
  }

  /** Whether this build can compose an app at all (see templateAvailable). */
  available(): boolean {
    return templateAvailable(this.env());
  }

  /**
   * The template's AppSpec schema, for a project whose app has no copy yet:
   * the snapshot's, else the template checkout's; null without either.
   */
  async schemaFile(): Promise<string | null> {
    const snapshot = await this.ready().catch((): null => null);
    if (snapshot) return path.join(snapshot.appDir, APP_SPEC_SCHEMA_FILE);
    const dir = this.env().templateDir;
    const file = dir ? path.join(dir, TEMPLATE_SPEC_SCHEMA_FILE) : null;
    return file && existsSync(file) ? file : null;
  }

  /** Starts a background check-and-compose; never throws. */
  warm(): void {
    if (!this.available()) return;
    void this.ensure().catch((err: Error) => {
      console.warn(`[fast-app] snapshot compose failed: ${err.message}`);
    });
  }

  /** The newest snapshot for the current sources, composing it if it is missing. */
  ensure(): Promise<Snapshot> {
    this.inflight ??= this.build().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /**
   * A snapshot to clone now. The first clone of a run waits for the check of
   * the current sources, so a template that changed since the last run (an
   * app update) is composed before a project gets it, never the snapshot of the
   * previous template. After the check, the last good snapshot.
   */
  async ready(): Promise<Snapshot> {
    await this.load();
    if (this.checkState === 'unchecked') return this.ensure();
    if (this.checkState === 'kept') void this.ensure().catch(() => {});
    return this.current ?? this.ensure();
  }

  private load(): Promise<void> {
    this.loading ??= this.readCurrent();
    return this.loading;
  }

  private async readCurrent(): Promise<void> {
    try {
      const saved = JSON.parse(
        await readFile(path.join(this.templatesDir, CURRENT_FILE), 'utf8'),
      ) as Snapshot;
      if (saved?.appDir && isComposed(saved.appDir)) {
        this.current = saved;
      }
    } catch {
      // No snapshot yet.
    }
  }

  private async build(): Promise<Snapshot> {
    await this.load();
    try {
      const source = await this.resolveSource(this.templatesDir);
      const snapshot = isComposed(path.join(this.templatesDir, source.key, 'app'))
        ? await this.readSnapshot(source)
        : await this.compose(source);
      await this.adopt(snapshot);
      this.checkState = 'checked';
      return snapshot;
    } catch (err) {
      if (!this.current) throw err;
      console.warn(`[fast-app] keeping snapshot ${this.current.key}: ${(err as Error).message}`);
      this.checkState = 'kept';
      return this.current;
    }
  }

  private async readSnapshot(source: ResolvedSource): Promise<Snapshot> {
    const meta = path.join(this.templatesDir, source.key, 'snapshot.json');
    try {
      return JSON.parse(await readFile(meta, 'utf8')) as Snapshot;
    } catch {
      return this.describe(source, new Date().toISOString());
    }
  }

  private describe(source: ResolvedSource, composedAt: string): Snapshot {
    return {
      key: source.key,
      appDir: path.join(this.templatesDir, source.key, 'app'),
      templateSha: source.templateSha,
      registryHash: source.registryHash,
      registryUrl: source.registryUrl,
      composedAt,
    };
  }

  private async compose(source: ResolvedSource): Promise<Snapshot> {
    const target = path.join(this.templatesDir, source.key);
    const staging = path.join(this.templatesDir, `.staging-${source.key}-${process.pid}`);
    await rm(staging, { recursive: true, force: true });
    await mkdir(staging, { recursive: true });
    const started = Date.now();
    const result = await runCommand(
      'node',
      [
        '--experimental-strip-types',
        'scripts/compose.ts',
        '--template',
        TEMPLATE_NAME,
        '--out',
        path.join(staging, 'app'),
        '--registry-url',
        source.registryUrl,
      ],
      { cwd: source.root, timeoutMs: COMPOSE_TIMEOUT_MS },
    );
    if (!result.ok || !isComposed(path.join(staging, 'app'))) {
      await rm(staging, { recursive: true, force: true });
      throw new Error(`Template compose failed:\n${outputTail(result.output)}`);
    }
    const snapshot = this.describe(source, new Date().toISOString());
    await writeFile(path.join(staging, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
    await rm(target, { recursive: true, force: true });
    await rename(staging, target);
    console.log(`[fast-app] composed snapshot ${source.key} in ${Date.now() - started} ms`);
    return snapshot;
  }

  private async adopt(snapshot: Snapshot): Promise<void> {
    this.current = snapshot;
    await writeFile(path.join(this.templatesDir, CURRENT_FILE), JSON.stringify(snapshot, null, 2));
    await this.prune(snapshot.key);
  }

  // Keeps the current snapshot and the one before it; a project cloned from
  // an older one is a copy, so removing it never breaks a project.
  private async prune(currentKey: string): Promise<void> {
    const entries = await readdir(this.templatesDir, { withFileTypes: true }).catch((): Dirent[] => []);
    const dirs = entries.filter((e) => e.isDirectory() && /^[0-9a-f]{8}-[0-9a-f]{8}$/.test(e.name));
    const dated = await Promise.all(
      dirs.map(async (e) => {
        const meta = await readFile(path.join(this.templatesDir, e.name, 'snapshot.json'), 'utf8')
          .then((text) => JSON.parse(text) as Snapshot)
          .catch((): null => null);
        return { name: e.name, at: meta?.composedAt ?? '' };
      }),
    );
    const keep = new Set([
      currentKey,
      ...dated
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, KEEP_SNAPSHOTS)
        .map((d) => d.name),
    ]);
    for (const dir of dirs) {
      if (!keep.has(dir.name)) {
        void rm(path.join(this.templatesDir, dir.name), { recursive: true, force: true });
      }
    }
    // A compose that a quit or a crash cut short leaves its staging folder,
    // named for its process; this process's own may still be in use.
    for (const entry of entries) {
      const pid = /^\.staging-.+-(\d+)$/.exec(entry.name)?.[1];
      if (entry.isDirectory() && pid && Number(pid) !== process.pid) {
        void rm(path.join(this.templatesDir, entry.name), { recursive: true, force: true });
      }
    }
  }

  /**
   * Clones the snapshot into `<project>/packages/app` and installs it (see
   * snapshot-clone.ts). Idempotent per project: a second call joins the first,
   * and a finished copy is reused only while its app is still there.
   */
  materialize(
    projectDir: string,
    signal?: AbortSignal,
    onTemplateCommitted?: () => void,
  ): Promise<void> {
    const existing = this.installs.get(projectDir);
    if (existing && (!existing.done || isComposed(appDirOf(projectDir)))) return existing.promise;
    const abort = new AbortController();
    const promise = cloneApp(
      projectDir,
      async () => (await this.ready()).appDir,
      signal ? AbortSignal.any([abort.signal, signal]) : abort.signal,
      onTemplateCommitted,
    );
    const entry: Install = { promise, abort, done: false };
    this.installs.set(projectDir, entry);
    promise.then(
      () => {
        entry.done = true;
      },
      () => {
        if (this.installs.get(projectDir) === entry) this.installs.delete(projectDir);
      },
    );
    return promise;
  }

  /** A project is going away: stop copying and installing its app. */
  forget(projectDir: string): void {
    this.installs.get(projectDir)?.abort.abort();
    this.installs.delete(projectDir);
  }
}
