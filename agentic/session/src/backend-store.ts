import { deriveSubdomainEndpoint } from '@agentic-kit/db-tools';
import { ConfigStore } from 'appstash';

import { checkContextName, ContextNameError, currentContextName, loadSession } from './account-store';

/** Every Constructive plane a binary talks to, one GraphQL endpoint each. */
export interface BackendConfig {
  apiEndpoint: string;
  authEndpoint: string;
  modulesEndpoint: string;
  agentEndpoint: string;
  computeEndpoint: string;
}

export const PLANES = ['api', 'auth', 'modules', 'agent', 'compute'] as const;
export type Plane = (typeof PLANES)[number];

const KEY: Record<Plane, keyof BackendConfig> = {
  api: 'apiEndpoint',
  auth: 'authEndpoint',
  modules: 'modulesEndpoint',
  agent: 'agentEndpoint',
  compute: 'computeEndpoint'
};

export function planeEndpoint(config: BackendConfig, plane: Plane): string {
  return config[KEY[plane]];
}

/** The planes whose endpoints differ, compared exactly (no case or slash folding). */
export function differingPlanes(a: BackendConfig, b: BackendConfig): Plane[] {
  return PLANES.filter((plane) => planeEndpoint(a, plane) !== planeEndpoint(b, plane));
}

/**
 * A stored context: complete, lacking planes (a context another app wrote;
 * planes are never filled in), or stored under a name that is not a valid
 * context name (`reason`), which no function will act on.
 */
export type BackendContext =
  | { name: string; current: boolean; status: 'complete'; backend: BackendConfig }
  | { name: string; current: boolean; status: 'incomplete'; missing: Plane[]; apiEndpoint?: string }
  | { name: string; current: boolean; status: 'invalid-name'; reason: string };

export type EndpointProblem = 'not-a-url' | 'scheme' | 'userinfo' | 'not-derivable';

/** An endpoint that cannot name a backend. The message never shows userinfo. */
export class EndpointError extends Error {
  constructor(
    readonly reason: EndpointProblem,
    readonly plane: Plane,
    message: string
  ) {
    super(message);
    this.name = 'EndpointError';
  }
}

function shown(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return endpoint.replace(/\/\/[^/@]*@/, '//');
  }
}

function checkedEndpoint(plane: Plane, raw: string): string {
  const endpoint = raw.trim();
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new EndpointError('not-a-url', plane, `The ${plane} endpoint "${shown(endpoint) || '(empty)'}" is not an absolute URL. Pass one such as https://${plane}.example.com/graphql.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new EndpointError('scheme', plane, `The ${plane} endpoint ${shown(endpoint)} uses ${url.protocol}, but only http and https are supported. Pass an http or https URL.`);
  }
  if (url.username || url.password) {
    throw new EndpointError('userinfo', plane, `The ${plane} endpoint ${shown(endpoint)} has a user name or password in it, which would go to every plane. Remove it; sign in with email and password instead.`);
  }
  return endpoint;
}

/**
 * The planes share the api endpoint's host scheme only when the host is
 * `api.<rest>` (api.example.com -> auth.example.com). Any other host would send
 * the password to a host the user never named, so it must give every plane.
 */
function derivedEndpoint(api: string, plane: Plane): string {
  const labels = new URL(api).hostname.split('.');
  if (labels[0] !== 'api' || labels.length < 2 || labels.some((label) => label === '')) {
    throw new EndpointError(
      'not-derivable',
      plane,
      `Cannot derive the ${plane} endpoint from ${shown(api)}: the other planes are derived only from a host that starts with "api.". Give every plane endpoint explicitly (auth, modules, agent and compute).`
    );
  }
  return deriveSubdomainEndpoint(api, plane);
}

/**
 * The backend that `api` names. A plane given explicitly is used as is; a
 * missing one is derived from an `api.<rest>` host. Throws `EndpointError`.
 */
export function backendFromEndpoints(endpoints: { api: string } & Partial<Record<Exclude<Plane, 'api'>, string>>): BackendConfig {
  const api = checkedEndpoint('api', endpoints.api ?? '');
  const config = { apiEndpoint: api } as BackendConfig;
  for (const plane of PLANES) {
    if (plane === 'api') continue;
    const given = endpoints[plane];
    config[KEY[plane]] = given !== undefined ? checkedEndpoint(plane, given) : derivedEndpoint(api, plane);
  }
  return config;
}

/**
 * A backend is a named context in the shared store, named after the api
 * endpoint's host without a leading `api.` (https://api.example.com/graphql ->
 * example.com), a port joined by a dash (example.com-8443). Credentials hang
 * off the context, so each backend keeps an independent session.
 */
export function contextNameFor(config: BackendConfig): string {
  const { host, hostname } = new URL(config.apiEndpoint);
  const labels = hostname.split('.');
  const raw = labels[0] === 'api' && labels.length >= 2 ? host.slice('api.'.length) : host;
  const name = raw
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .slice(0, 100)
    .replace(/[^a-z0-9]+$/, '');
  return checkContextName(name || 'backend');
}

type Targets = Record<string, { endpoint: string }> | undefined;

/** A stored context under a valid name: complete or lacking planes. */
export type NamedBackendContext = Exclude<BackendContext, { status: 'invalid-name' }>;

function fromTargets(name: string, current: boolean, targets: Targets): NamedBackendContext {
  const missing = PLANES.filter((plane) => !targets?.[plane]?.endpoint);
  if (missing.length > 0) {
    const apiEndpoint = targets?.api?.endpoint;
    return { name, current, status: 'incomplete', missing, ...(apiEndpoint ? { apiEndpoint } : {}) };
  }
  const backend = {} as BackendConfig;
  for (const plane of PLANES) backend[KEY[plane]] = targets[plane].endpoint;
  return { name, current, status: 'complete', backend };
}

/** One stored context, or null when there is none with that name. */
export function readBackend(store: ConfigStore, name: string): NamedBackendContext | null {
  const ctx = store.loadContext(checkContextName(name));
  return ctx ? fromTargets(name, name === currentContextName(store), ctx.targets) : null;
}

/** Every stored context. One with a name that does not pass the check is listed as `invalid-name` and stops nothing. */
export function listBackends(store: ConfigStore): BackendContext[] {
  const current = store.loadSettings().currentContext;
  return store.listContexts().map((ctx) => {
    const name = String(ctx.name);
    try {
      checkContextName(name);
    } catch (err) {
      if (!(err instanceof ContextNameError)) throw err;
      return { name, current: name === current, status: 'invalid-name', reason: err.message };
    }
    return fromTargets(name, name === current, ctx.targets);
  });
}

/** Storing other endpoints under the context, or removing it, would drop the session filed there while its API key stays valid. */
export class ContextInUseError extends Error {
  constructor(
    readonly context: string,
    readonly action: 'store' | 'remove'
  ) {
    super(
      action === 'store'
        ? `The context "${context}" holds a session that was not issued for these endpoints, so storing them would drop it while its API key stays valid. Sign out of "${context}" first, which revokes that key, or store the backend under another name.`
        : `The context "${context}" holds a session, so removing it would drop the session while its API key stays valid. Sign out of "${context}" first, which revokes that key.`
    );
    this.name = 'ContextInUseError';
  }
}

/**
 * Store the endpoints as a context (default name: `contextNameFor`), keeping
 * its current choice and the session filed under that name, which must have
 * been issued for exactly these five endpoints. Throws `ContextInUseError`
 * when it was not, or cannot be shown to be: sign out of that context first.
 */
export function addBackend(store: ConfigStore, config: BackendConfig, name: string = contextNameFor(config)): { name: string } {
  checkContextName(name);
  if (store.getCredentials(name)) {
    const issuedFor = loadSession(store, name)?.issuedFor;
    if (!issuedFor || differingPlanes(issuedFor, config).length > 0) throw new ContextInUseError(name, 'store');
  }
  const targets = Object.fromEntries(PLANES.map((plane) => [plane, { endpoint: config[KEY[plane]] }]));
  store.createContext(name, { endpoint: config.apiEndpoint, targets });
  return { name };
}

export function selectBackend(store: ConfigStore, name: string): void {
  if (!store.setCurrentContext(checkContextName(name))) {
    const known = store.listContexts().map((ctx) => ctx.name);
    throw new Error(
      `No backend context named "${name}". Known contexts: ${known.join(', ') || '(none)'}. Add the backend first.`
    );
  }
}

/** Delete a context. Throws `ContextInUseError` while a session is filed under it: `signOut` first, which revokes its key. */
export function removeBackend(store: ConfigStore, name: string): boolean {
  if (store.getCredentials(checkContextName(name))) throw new ContextInUseError(name, 'remove');
  return store.deleteContext(name);
}
