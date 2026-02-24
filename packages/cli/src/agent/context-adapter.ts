import type { ContextConfig, ContextCredentials } from '../config';
import {
  getContextCredentials,
  getCurrentContext,
  hasValidCredentials,
  loadContext,
} from '../config';

export type ValueSource = 'flag' | 'env' | 'context' | 'unset';

export interface ResolveConstructiveEnvironmentOptions {
  contextName?: string;
  endpoint?: string;
  token?: string;
  operationsFile?: string;
  noContextDefaults?: boolean;
  baseEnv?: NodeJS.ProcessEnv;
  lookup?: ContextLookup;
}

export interface ResolvedConstructiveEnvironment {
  contextName?: string;
  endpoint?: string;
  token?: string;
  operationsFile?: string;
  endpointSource: ValueSource;
  tokenSource: ValueSource;
  operationsFileSource: ValueSource;
  env: Record<string, string>;
  warnings: string[];
}

export interface ContextLookup {
  getCurrentContext: () => ContextConfig | null;
  loadContext: (contextName: string) => ContextConfig | null;
  hasValidCredentials: (contextName: string) => boolean;
  getContextCredentials: (
    contextName: string,
  ) => ContextCredentials | null;
}

const DEFAULT_LOOKUP: ContextLookup = {
  getCurrentContext,
  loadContext,
  hasValidCredentials,
  getContextCredentials,
};

const normalizeString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export function resolveConstructiveEnvironment(
  options: ResolveConstructiveEnvironmentOptions = {},
): ResolvedConstructiveEnvironment {
  const lookup = options.lookup || DEFAULT_LOOKUP;
  const env = options.baseEnv || process.env;
  const warnings: string[] = [];

  let contextName = normalizeString(options.contextName);
  let contextRecord: ContextConfig | null = null;

  if (!options.noContextDefaults) {
    if (contextName) {
      contextRecord = lookup.loadContext(contextName);
      if (!contextRecord) {
        warnings.push(
          `Context "${contextName}" was not found; skipping context defaults.`,
        );
      }
    } else {
      contextRecord = lookup.getCurrentContext();
      contextName = contextRecord?.name;
    }
  }

  let endpoint = normalizeString(options.endpoint);
  let endpointSource: ValueSource = endpoint ? 'flag' : 'unset';
  if (!endpoint) {
    endpoint = normalizeString(env.CONSTRUCTIVE_GRAPHQL_ENDPOINT);
    endpointSource = endpoint ? 'env' : 'unset';
  }
  if (!endpoint && contextRecord) {
    endpoint = normalizeString(contextRecord.endpoint);
    endpointSource = endpoint ? 'context' : 'unset';
  }

  let token = normalizeString(options.token);
  let tokenSource: ValueSource = token ? 'flag' : 'unset';
  if (!token) {
    token = normalizeString(env.CONSTRUCTIVE_ACCESS_TOKEN);
    tokenSource = token ? 'env' : 'unset';
  }
  if (!token && contextRecord?.name) {
    const hasCredentials = lookup.hasValidCredentials(contextRecord.name);
    const credentials = hasCredentials
      ? lookup.getContextCredentials(contextRecord.name)
      : null;
    token = normalizeString(credentials?.token);
    tokenSource = token ? 'context' : 'unset';
  }

  let operationsFile = normalizeString(options.operationsFile);
  let operationsFileSource: ValueSource = operationsFile ? 'flag' : 'unset';
  if (!operationsFile) {
    operationsFile = normalizeString(env.CONSTRUCTIVE_OPERATIONS_FILE);
    operationsFileSource = operationsFile ? 'env' : 'unset';
  }

  if (!endpoint) {
    warnings.push(
      'No Constructive GraphQL endpoint resolved. Set --endpoint, CONSTRUCTIVE_GRAPHQL_ENDPOINT, or configure cnc context.',
    );
  }

  if (!token) {
    warnings.push(
      'No Constructive access token resolved. Set --token, CONSTRUCTIVE_ACCESS_TOKEN, or configure cnc auth.',
    );
  }

  const resolvedEnv: Record<string, string> = {};
  if (endpoint) {
    resolvedEnv.CONSTRUCTIVE_GRAPHQL_ENDPOINT = endpoint;
  }
  if (token) {
    resolvedEnv.CONSTRUCTIVE_ACCESS_TOKEN = token;
  }
  if (operationsFile) {
    resolvedEnv.CONSTRUCTIVE_OPERATIONS_FILE = operationsFile;
  }

  return {
    contextName,
    endpoint,
    token,
    operationsFile,
    endpointSource,
    tokenSource,
    operationsFileSource,
    env: resolvedEnv,
    warnings,
  };
}
