/**
 * Versioned, atomic configuration storage for CNC.
 *
 * The public functions at the bottom preserve the original synchronous API.
 * New operation code should prefer an injected ConfigStore so tests and
 * concurrent invocations never depend on mutable module state.
 */

import { appstash, resolve as resolveAppPath } from 'appstash';
import * as fs from 'fs';
import * as path from 'path';

import { ConfigStoreError } from './config-errors';
import { DirectoryLockTimeoutError, withDirectoryLock } from './directory-lock';
import {
  cloneState,
  invalidConfig,
  parseContext,
  parseCredentials,
  parseSettings,
  parseState,
  validateContextName,
  validateEndpoint,
} from './state-validation';
import type {
  CncState,
  ContextConfig,
  ContextCredentials,
  Credentials,
  GlobalSettings,
} from './types';
import { CURRENT_STATE_VERSION, DEFAULT_STATE } from './types';

export { type ConfigErrorCode,ConfigStoreError } from './config-errors';
export { validateContextName, validateEndpoint } from './state-validation';

const TOOL_NAME = 'cnc';
const STATE_FILENAME = 'state.json';
const LOCK_FILENAME = 'state.lock';
const DEFAULT_LOCK_TIMEOUT_MS = 2_000;
const DEFAULT_STALE_LOCK_MS = 30_000;
const LOCK_RETRY_MS = 20;
export interface ConfigStoreOptions {
  /** Absolute directory containing CNC configuration files. */
  configDir: string;
  clock?: () => Date;
  lockTimeoutMs?: number;
  staleLockMs?: number;
}

interface LoadedState {
  state: CncState;
  source: 'canonical' | 'legacy' | 'empty';
}

interface NodeError extends Error {
  code?: string;
}

let temporaryFileSequence = 0;

function parseJsonFile(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (cause) {
    return invalidConfig(
      `Unable to parse configuration file "${file}".`,
      file,
      cause
    );
  }
}

function assertNotSymlink(file: string): void {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    const code = (error as NodeError).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return;
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new ConfigStoreError(
      'CONFIG_SYMLINK_REJECTED',
      `Refusing to use symlinked configuration path "${file}".`,
      { file }
    );
  }
}

/** Reject every existing symlink component, including ancestors of configDir. */
function assertNoSymlinkComponents(file: string): void {
  const absolute = path.resolve(file);
  const root = path.parse(absolute).root;
  let current = root;
  assertNotSymlink(current);

  const relative = path.relative(root, absolute);
  if (relative === '') return;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    assertNotSymlink(current);
  }
}

export class ConfigStore {
  readonly configDir: string;
  private readonly clock: () => Date;
  private readonly lockTimeoutMs: number;
  private readonly staleLockMs: number;

  constructor(options: ConfigStoreOptions) {
    if (!path.isAbsolute(options.configDir)) {
      throw new ConfigStoreError(
        'CONFIG_INVALID',
        'ConfigStore configDir must be absolute.'
      );
    }
    this.configDir = path.resolve(options.configDir);
    this.clock = options.clock ?? (() => new Date());
    this.lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
    this.staleLockMs = options.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
  }

  get statePath(): string {
    return path.join(this.configDir, STATE_FILENAME);
  }

  read(): CncState {
    return cloneState(this.readWithSource().state);
  }

  mutate<T>(mutator: (state: CncState) => T): T {
    return this.withLock(() => {
      const loaded = this.readWithSource();
      const next = cloneState(loaded.state);
      const result = mutator(next);
      const validated = parseState(next, this.statePath);
      if (loaded.source === 'legacy') this.backupLegacyFiles();
      this.writeAtomic(validated);
      return result;
    });
  }

  private ensureConfigDir(): void {
    assertNoSymlinkComponents(this.configDir);
    fs.mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    assertNoSymlinkComponents(this.configDir);
    fs.chmodSync(this.configDir, 0o700);
  }

  private readWithSource(): LoadedState {
    assertNoSymlinkComponents(this.configDir);
    assertNotSymlink(this.statePath);
    if (fs.existsSync(this.statePath)) {
      return {
        state: parseState(parseJsonFile(this.statePath), this.statePath),
        source: 'canonical',
      };
    }
    return this.readLegacyState();
  }

  private readLegacyState(): LoadedState {
    const settingsPath = path.join(this.configDir, 'settings.json');
    const credentialsPath = path.join(this.configDir, 'credentials.json');
    const contextsDir = path.join(this.configDir, 'contexts');
    assertNotSymlink(settingsPath);
    assertNotSymlink(credentialsPath);
    assertNotSymlink(contextsDir);
    const hasLegacy =
      fs.existsSync(settingsPath) ||
      fs.existsSync(credentialsPath) ||
      fs.existsSync(contextsDir);
    if (!hasLegacy) {
      return { state: cloneState(DEFAULT_STATE), source: 'empty' };
    }

    const settings = fs.existsSync(settingsPath)
      ? parseSettings(parseJsonFile(settingsPath), settingsPath)
      : {};
    const credentials = fs.existsSync(credentialsPath)
      ? parseCredentials(parseJsonFile(credentialsPath), credentialsPath)
      : { tokens: {} };
    const contexts: Record<string, ContextConfig> = {};

    if (fs.existsSync(contextsDir)) {
      if (!fs.statSync(contextsDir).isDirectory()) {
        return invalidConfig(
          'Legacy contexts path is not a directory.',
          contextsDir
        );
      }
      for (const entry of fs.readdirSync(contextsDir, {
        withFileTypes: true,
      })) {
        if (!entry.name.endsWith('.json')) continue;
        const file = path.join(contextsDir, entry.name);
        if (!entry.isFile()) {
          if (entry.isSymbolicLink()) assertNotSymlink(file);
          return invalidConfig(
            'Legacy context entry is not a regular file.',
            file
          );
        }
        assertNotSymlink(file);
        const expectedName = entry.name.slice(0, -'.json'.length);
        validateContextName(expectedName);
        const context = parseContext(parseJsonFile(file), file);
        if (context.name !== expectedName) {
          return invalidConfig(
            `Legacy context filename "${entry.name}" does not match its stored name.`,
            file
          );
        }
        contexts[context.name] = context;
      }
    }

    if (settings.currentContext && !contexts[settings.currentContext]) {
      return invalidConfig(
        `Current context "${settings.currentContext}" does not exist.`,
        settingsPath
      );
    }
    const orphanedCredentials = Object.keys(credentials.tokens).filter(
      (name) => !contexts[name]
    );
    if (orphanedCredentials.length > 0) {
      return invalidConfig(
        `Stored credentials reference missing contexts: ${orphanedCredentials.join(', ')}.`,
        credentialsPath
      );
    }
    return {
      state: {
        stateVersion: CURRENT_STATE_VERSION,
        settings,
        contexts,
        credentials,
      },
      source: 'legacy',
    };
  }

  private backupLegacyFiles(): void {
    const entries = ['settings.json', 'credentials.json', 'contexts'].filter(
      (name) => fs.existsSync(path.join(this.configDir, name))
    );
    if (entries.length === 0) return;

    const stamp = this.clock().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(
      this.configDir,
      `legacy-backup-${stamp}-${process.pid}-${temporaryFileSequence++}`
    );
    fs.mkdirSync(backupDir, { mode: 0o700 });
    for (const entry of entries) {
      const source = path.join(this.configDir, entry);
      assertNotSymlink(source);
      const destination = path.join(backupDir, entry);
      if (fs.statSync(source).isDirectory()) {
        fs.mkdirSync(destination, { mode: 0o700 });
        for (const child of fs.readdirSync(source, { withFileTypes: true })) {
          const childSource = path.join(source, child.name);
          if (!child.isFile()) {
            assertNotSymlink(childSource);
            return invalidConfig(
              'Legacy backup encountered a non-file context entry.',
              childSource
            );
          }
          assertNotSymlink(childSource);
          fs.copyFileSync(childSource, path.join(destination, child.name));
          fs.chmodSync(path.join(destination, child.name), 0o600);
        }
      } else {
        fs.copyFileSync(source, destination);
        fs.chmodSync(destination, 0o600);
      }
    }
  }

  private writeAtomic(state: CncState): void {
    this.ensureConfigDir();
    assertNotSymlink(this.statePath);
    const temporaryPath = path.join(
      this.configDir,
      `.state.${process.pid}.${temporaryFileSequence++}.tmp`
    );
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(
        temporaryPath,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
        0o600
      );
      fs.writeFileSync(
        descriptor,
        `${JSON.stringify(state, null, 2)}\n`,
        'utf8'
      );
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.renameSync(temporaryPath, this.statePath);
      fs.chmodSync(this.statePath, 0o600);
      this.fsyncDirectory();
    } catch (cause) {
      if (descriptor !== undefined) fs.closeSync(descriptor);
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      throw cause;
    }
  }

  private fsyncDirectory(): void {
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(this.configDir, fs.constants.O_RDONLY);
      fs.fsyncSync(descriptor);
    } catch (error) {
      const code = (error as NodeError).code;
      if (code !== 'EINVAL' && code !== 'EPERM') throw error;
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
  }

  private withLock<T>(operation: () => T): T {
    this.ensureConfigDir();
    const lockPath = path.join(this.configDir, LOCK_FILENAME);
    try {
      return withDirectoryLock(
        {
          lockPath,
          timeoutMs: this.lockTimeoutMs,
          staleMs: this.staleLockMs,
          retryMs: LOCK_RETRY_MS,
          assertSafePath: assertNotSymlink,
        },
        operation
      );
    } catch (error) {
      if (!(error instanceof DirectoryLockTimeoutError)) throw error;
      throw new ConfigStoreError(
        'CONFIG_LOCK_TIMEOUT',
        'Timed out waiting for another CNC process to finish updating configuration.',
        { timeoutMs: this.lockTimeoutMs },
        { cause: error }
      );
    }
  }
}

/** Get appstash directories without exposing configuration contents. */
export function getAppDirs() {
  return appstash(TOOL_NAME, { ensure: true });
}

export function getDefaultConfigDir(): string {
  return resolveAppPath(getAppDirs(), 'config');
}

/**
 * Resolve the historical appstash location from an adapter-owned environment
 * snapshot. The directory is deliberately not created until a state mutation
 * needs it, so registry construction and discovery remain side-effect free.
 */
export function getConfigDirForEnvironment(
  environment: Readonly<Record<string, string | undefined>>
): string {
  const baseDir =
    environment.APPSTASH_BASE_DIR ??
    environment.HOME ??
    environment.USERPROFILE;
  if (baseDir === undefined || baseDir.trim().length === 0) {
    throw new ConfigStoreError(
      'CONFIG_BASE_DIRECTORY_REQUIRED',
      'An explicit APPSTASH_BASE_DIR, HOME, or USERPROFILE is required to resolve CNC state.'
    );
  }
  const dirs = appstash(TOOL_NAME, {
    ensure: false,
    baseDir,
  });
  return resolveAppPath(dirs, 'config');
}

export function createConfigStoreForEnvironment(
  environment: Readonly<Record<string, string | undefined>>
): ConfigStore {
  return new ConfigStore({
    configDir: getConfigDirForEnvironment(environment),
  });
}

let defaultStore: ConfigStore | undefined;

export function getDefaultConfigStore(): ConfigStore {
  defaultStore ??= new ConfigStore({ configDir: getDefaultConfigDir() });
  return defaultStore;
}

export function loadSettings(
  store: ConfigStore = getDefaultConfigStore()
): GlobalSettings {
  return store.read().settings;
}

export function saveSettings(
  settings: GlobalSettings,
  store: ConfigStore = getDefaultConfigStore()
): void {
  store.mutate((state) => {
    state.settings = { ...settings };
  });
}

export function loadCredentials(
  store: ConfigStore = getDefaultConfigStore()
): Credentials {
  return store.read().credentials;
}

export function saveCredentials(
  credentials: Credentials,
  store: ConfigStore = getDefaultConfigStore()
): void {
  store.mutate((state) => {
    state.credentials = {
      tokens: Object.fromEntries(
        Object.entries(credentials.tokens).map(([name, value]) => [
          name,
          { ...value },
        ])
      ),
    };
  });
}

export function loadContext(
  contextName: string,
  store: ConfigStore = getDefaultConfigStore()
): ContextConfig | null {
  validateContextName(contextName);
  return store.read().contexts[contextName] ?? null;
}

export function saveContext(
  context: ContextConfig,
  store: ConfigStore = getDefaultConfigStore()
): void {
  validateContextName(context.name);
  validateEndpoint(context.endpoint);
  store.mutate((state) => {
    state.contexts[context.name] = { ...context };
  });
}

/** Delete context, credentials, and the active selection in one state commit. */
export function deleteContext(
  contextName: string,
  store: ConfigStore = getDefaultConfigStore()
): boolean {
  validateContextName(contextName);
  return store.mutate((state) => {
    if (!state.contexts[contextName]) return false;
    delete state.contexts[contextName];
    delete state.credentials.tokens[contextName];
    if (state.settings.currentContext === contextName) {
      delete state.settings.currentContext;
    }
    return true;
  });
}

export function listContexts(
  store: ConfigStore = getDefaultConfigStore()
): ContextConfig[] {
  return listContextsFromState(store.read());
}

export function listContextsFromState(state: CncState): ContextConfig[] {
  return Object.values(state.contexts).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function getCurrentContext(
  store: ConfigStore = getDefaultConfigStore()
): ContextConfig | null {
  const state = store.read();
  return state.settings.currentContext
    ? (state.contexts[state.settings.currentContext] ?? null)
    : null;
}

export function setCurrentContext(
  contextName: string,
  store: ConfigStore = getDefaultConfigStore()
): boolean {
  validateContextName(contextName);
  return store.mutate((state) => {
    if (!state.contexts[contextName]) return false;
    state.settings.currentContext = contextName;
    return true;
  });
}

export function createContext(
  name: string,
  endpoint: string,
  store: ConfigStore = getDefaultConfigStore(),
  now: Date = new Date()
): ContextConfig {
  return createContextAndMaybeActivate(name, endpoint, store, now, false)
    .context;
}

/** Create a context and optionally select it in the same locked state commit. */
export function createContextAndMaybeActivate(
  name: string,
  endpoint: string,
  store: ConfigStore,
  now: Date,
  activateIfUnset = true
): { context: ContextConfig; activated: boolean } {
  validateContextName(name);
  validateEndpoint(endpoint);
  const timestamp = now.toISOString();
  const context: ContextConfig = {
    name,
    endpoint,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const activated = store.mutate((state) => {
    if (state.contexts[name]) {
      throw new ConfigStoreError(
        'CONFIG_INVALID',
        `Context "${name}" already exists.`,
        { contextName: name }
      );
    }
    state.contexts[name] = context;
    if (activateIfUnset && state.settings.currentContext === undefined) {
      state.settings.currentContext = name;
      return true;
    }
    return false;
  });
  return { context: { ...context }, activated };
}

export function getContextCredentials(
  contextName: string,
  store: ConfigStore = getDefaultConfigStore()
): ContextCredentials | null {
  validateContextName(contextName);
  return store.read().credentials.tokens[contextName] ?? null;
}

export function setContextCredentials(
  contextName: string,
  token: string,
  options?: { expiresAt?: string; refreshToken?: string },
  store: ConfigStore = getDefaultConfigStore()
): void {
  validateContextName(contextName);
  const trimmedToken = token.trim();
  if (trimmedToken === '') {
    throw new ConfigStoreError('CONFIG_INVALID', 'Token cannot be empty.');
  }
  store.mutate((state) => {
    if (!state.contexts[contextName]) {
      throw new ConfigStoreError(
        'CONTEXT_NOT_FOUND',
        `Context "${contextName}" was not found.`,
        { contextName }
      );
    }
    state.credentials.tokens[contextName] = {
      token: trimmedToken,
      expiresAt: options?.expiresAt,
      refreshToken: options?.refreshToken,
    };
  });
}

export function removeContextCredentials(
  contextName: string,
  store: ConfigStore = getDefaultConfigStore()
): boolean {
  validateContextName(contextName);
  return store.mutate((state) => {
    if (!state.credentials.tokens[contextName]) return false;
    delete state.credentials.tokens[contextName];
    return true;
  });
}

export function hasValidCredentials(
  contextName: string,
  store: ConfigStore = getDefaultConfigStore(),
  now: Date = new Date()
): boolean {
  const credentials = getContextCredentials(contextName, store);
  if (!credentials?.token) return false;
  return !credentials.expiresAt || new Date(credentials.expiresAt) > now;
}
