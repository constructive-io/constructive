import type { ProviderAdapter } from '../adapter';
import { ProviderAdapterError } from '../types';
import { githubAdapter } from './github';
import { googleAdapter } from './google';

const providerAdapters = new Map<string, ProviderAdapter>([
  [googleAdapter.kind, googleAdapter as ProviderAdapter],
  [githubAdapter.kind, githubAdapter as ProviderAdapter]
]);

export const getProviderAdapter = (providerKey: string): ProviderAdapter => {
  const adapter = providerAdapters.get(providerKey);
  if (!adapter) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The selected identity Provider is not supported.'
    );
  }
  return adapter;
};

export const getProviderAdapterKinds = (): readonly string[] =>
  [...providerAdapters.keys()];

export type { ValidatedGitHubConfiguration } from './github';
export { githubAdapter } from './github';
export type { ValidatedGoogleConfiguration } from './google';
export { googleAdapter } from './google';
