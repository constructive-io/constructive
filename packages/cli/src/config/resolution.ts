import type { ConfigStore, ConfigStoreError } from './config-manager';
import {
  ConfigStoreError as StoreError,
  getDefaultConfigStore,
  validateContextName,
} from './config-manager';
import type { ContextConfig } from './types';

export type EnvironmentMap = Readonly<Record<string, string | undefined>>;

export interface ResolveContextOptions {
  contextName?: string;
  env?: EnvironmentMap;
  allowCurrentContext?: boolean;
  store?: ConfigStore;
}

export interface ResolvedContext {
  context: ContextConfig;
  source: 'argument' | 'environment' | 'current';
}

/**
 * Resolve an explicit argument first, then CNC_CONTEXT, then (for human
 * compatibility only) the globally selected context.
 */
export function resolveContext(
  options: ResolveContextOptions = {}
): ResolvedContext {
  const store = options.store ?? getDefaultConfigStore();
  const explicit = options.contextName?.trim();
  const fromEnvironment = options.env?.CNC_CONTEXT?.trim();
  const selected = explicit || fromEnvironment;
  const source = explicit
    ? 'argument'
    : fromEnvironment
      ? 'environment'
      : 'current';
  const state = store.read();

  if (!selected) {
    if (
      options.allowCurrentContext === false ||
      !state.settings.currentContext
    ) {
      throw new StoreError(
        'CONTEXT_REQUIRED',
        'A context is required. Pass --context or set CNC_CONTEXT.'
      );
    }
    const current = state.contexts[state.settings.currentContext];
    if (!current) {
      throw new StoreError(
        'CONFIG_INVALID',
        `Current context "${state.settings.currentContext}" does not exist.`
      );
    }
    return { context: current, source };
  }

  validateContextName(selected);
  const context = state.contexts[selected];
  if (!context) {
    throw new StoreError(
      'CONTEXT_NOT_FOUND',
      `Context "${selected}" was not found.`,
      { contextName: selected }
    );
  }
  return { context, source };
}

// Preserve a named type export for callers that only import this module.
export type { ConfigStoreError };
