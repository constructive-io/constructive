import { buildProviderHeaders, resolveProvider } from './providers';
import { providerName } from './transforms';
import type { AgenticServerOptions, ResolvedProvider } from './types';

/** A model a caller can run: what to send as `model`, and what to show for it. */
export interface ServedModel {
  id: string;
  name: string;
}

/** Appended to an upstream "no such model" answer, so the caller knows where to look. */
export const MODEL_LIST_HINT = 'GET /v1/models lists the models this gateway serves';

const configuredProviders = (options: AgenticServerOptions): ResolvedProvider[] =>
  options.providers && options.providers.length > 0
    ? options.providers
    : [resolveProvider(options)];

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

/** The models one provider serves, as its own listing names them. */
async function upstreamModels(provider: ResolvedProvider): Promise<ServedModel[]> {
  const url = provider.type === 'ollama'
    ? `${provider.baseUrl}/api/tags`
    : `${provider.baseUrl}/v1/models`;
  const res = await fetch(url, { headers: buildProviderHeaders(provider) });
  if (!res.ok) {
    throw new Error(`${providerName(provider)} answered ${res.status} to a model listing`);
  }
  const body = await res.json() as { models?: unknown; data?: unknown };
  const rows = provider.type === 'ollama' ? body.models : body.data;
  if (!Array.isArray(rows)) {
    throw new Error(`${providerName(provider)} answered a model listing with no list`);
  }
  return rows.flatMap((row: Record<string, unknown>) => {
    const id = text(provider.type === 'ollama' ? row.name : row.id);
    return id ? [{ id, name: text(row.display_name) ?? id }] : [];
  });
}

/**
 * Every model the gateway serves, under the id that reaches it: the bare
 * upstream id when the router would send that to the provider serving it, the
 * `name/` prefixed one otherwise. Only the id and a display name leave here —
 * which provider serves a model, and where, is the deployment's business.
 */
export async function listServedModels(options: AgenticServerOptions): Promise<ServedModel[]> {
  const providers = configuredProviders(options);
  const lists = await Promise.all(providers.map(upstreamModels));
  const seen = new Set<string>();
  return lists.flatMap((models, index) => {
    const provider = providers[index];
    return models.flatMap(({ id, name }) => {
      const routed = resolveProvider(options, id);
      const bare = providers.length === 1 || providerName(routed) === providerName(provider);
      const served = bare ? id : `${providerName(provider)}/${id}`;
      if (seen.has(served)) return [];
      seen.add(served);
      return [{ id: served, name }];
    });
  });
}
