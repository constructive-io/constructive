/**
 * Start a pi session with a run's lanes attached.
 *
 * pi ships as ESM only, and every host already imports it dynamically (the
 * desktop main process does this in `bootstrap`, before pi's storage paths are
 * resolved). So the module is *injected* rather than imported here: this package
 * stays CJS+ESM publishable, the host keeps control of when pi loads, and these
 * paths are testable without a model, a network or a filesystem.
 *
 * pi takes extensions through a `ResourceLoader`, not through
 * `createAgentSession`, so embedding means handing the composed factories to a
 * loader — pi's default one, or the host's own (the desktop harness builds one
 * that layers its skills, prompts and templates).
 */

import type {
  CreateAgentSessionOptions,
  CreateAgentSessionResult,
  ExtensionFactory,
  ResourceLoader
} from '@earendil-works/pi-coding-agent';

import { type ComposedRun, composeRun, type ComposeRunOptions } from './lanes';

export interface ResourceLoaderRequest {
  /** The lane extensions, in load order. Give these to the loader. */
  extensionFactories: ExtensionFactory[];
  cwd: string;
  agentDir: string;
}

export type CreateResourceLoader = (request: ResourceLoaderRequest) => ResourceLoader | Promise<ResourceLoader>;

/** The slice of the pi module this package needs, so a host can inject it. */
export interface PiModule {
  createAgentSession: (options: CreateAgentSessionOptions) => Promise<CreateAgentSessionResult>;
  DefaultResourceLoader: new (options: {
    cwd: string;
    agentDir: string;
    extensionFactories?: ExtensionFactory[];
  }) => ResourceLoader;
  getAgentDir?: () => string;
}

export interface StartRunOptions extends ComposeRunOptions {
  /** `await import('@earendil-works/pi-coding-agent')`. */
  pi: PiModule;
  cwd?: string;
  /** pi's config/storage dir. Defaults to `pi.getAgentDir()` when available. */
  agentDir?: string;
  /** Passed through to pi, minus the ones this package owns. */
  session?: Omit<CreateAgentSessionOptions, 'cwd' | 'agentDir' | 'resourceLoader'>;
  /** Layer the lanes onto a host's own loader instead of pi's default. */
  createResourceLoader?: CreateResourceLoader;
}

export interface EmbeddedRun {
  run: ComposedRun;
  session: CreateAgentSessionResult['session'];
  extensionsResult: CreateAgentSessionResult['extensionsResult'];
  modelFallbackMessage?: string;
  resourceLoader: ResourceLoader;
  /**
   * Flush the lanes, then dispose the session. Flush first and let a failure
   * propagate *after* disposal, so a delivery error is never traded for a leaked
   * session — and never swallowed into a clean-looking shutdown.
   */
  close(): Promise<void>;
}

export async function startRun(options: StartRunOptions): Promise<EmbeddedRun> {
  const cwd = options.cwd ?? process.cwd();
  const agentDir = options.agentDir ?? options.pi.getAgentDir?.();
  if (agentDir === undefined) {
    throw new Error('pi-embed: agentDir is required when the injected pi module has no getAgentDir()');
  }

  const run = composeRun(options);
  const resourceLoader = await (options.createResourceLoader ?? defaultResourceLoader(options.pi))({
    extensionFactories: run.extensions,
    cwd,
    agentDir
  });

  const result = await options.pi.createAgentSession({ ...options.session, cwd, agentDir, resourceLoader });

  return {
    run,
    session: result.session,
    extensionsResult: result.extensionsResult,
    ...(result.modelFallbackMessage === undefined ? {} : { modelFallbackMessage: result.modelFallbackMessage }),
    resourceLoader,
    close: async (): Promise<void> => {
      let failure: unknown;
      try {
        await run.flush();
      } catch (error) {
        failure = error;
      }
      result.session.dispose();
      if (failure !== undefined) throw failure;
    }
  };
}

const defaultResourceLoader =
  (pi: PiModule): CreateResourceLoader =>
    async (request) => {
      const loader = new pi.DefaultResourceLoader({
        cwd: request.cwd,
        agentDir: request.agentDir,
        extensionFactories: request.extensionFactories
      });
      // pi's loader discovers nothing until it is reloaded once.
      await loader.reload();
      return loader;
    };
