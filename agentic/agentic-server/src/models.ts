import { buildProviderHeaders, resolveProvider } from './providers';
import { providerName, upstreamModel } from './transforms';
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

const served = (row: Record<string, unknown>, idField: string): ServedModel[] => {
  const id = text(row[idField]);
  return id ? [{ id, name: text(row.display_name) ?? id }] : [];
};

/** The models one provider serves, as its own listing names them. */
async function upstreamModels(provider: ResolvedProvider): Promise<ServedModel[]> {
  const listing = async (url: string): Promise<Record<string, unknown>> => {
    const res = await fetch(url, { headers: buildProviderHeaders(provider) });
    if (!res.ok) {
      throw new Error(`${providerName(provider)} answered ${res.status} to a model listing`);
    }
    return await res.json() as Record<string, unknown>;
  };
  const rows = (list: unknown): Record<string, unknown>[] => {
    if (!Array.isArray(list)) {
      throw new Error(`${providerName(provider)} answered a model listing with no list`);
    }
    return list;
  };

  if (provider.type === 'ollama') {
    const body = await listing(`${provider.baseUrl}/api/tags`);
    return rows(body.models).flatMap((row) => served(row, 'name'));
  }

  // A listing may be paged (Anthropic's is): follow it to the end, or the
  // models on a later page read as not served.
  const models: ServedModel[] = [];
  let after: string | undefined;
  do {
    const page = after ? `?after_id=${encodeURIComponent(after)}` : '';
    const body = await listing(`${provider.baseUrl}/v1/models${page}`);
    models.push(...rows(body.data).flatMap((row) => served(row, 'id')));
    const next = body.has_more === true ? text(body.last_id) : undefined;
    if (next === after) break;
    after = next;
  } while (after);
  return models;
}

/**
 * Every model the gateway serves, under the id that reaches it: the bare
 * upstream id when the router would send that, unchanged, to the provider serving it, the
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
      // Bare only when the id both routes here and survives the prefix strip:
      // an upstream id that itself begins `openai/` would lose that segment.
      const bare =
        (providers.length === 1 || providerName(routed) === providerName(provider)) &&
        upstreamModel(provider, id) === id;
      const served = bare ? id : `${providerName(provider)}/${id}`;
      if (seen.has(served)) return [];
      seen.add(served);
      return [{ id: served, name }];
    });
  });
}
