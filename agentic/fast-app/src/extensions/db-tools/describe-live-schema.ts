import { resolveDataToken, resolveProjectContext } from '@agentic-kit/pi';
import type { AgentToolResult, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';

import {
  type DescribeLiveSchemaDetails,
  formatLiveSchemaText,
} from './describe-live-schema-format';
import { fetchLiveMeta } from './live-meta';

const ParamSchema = Type.Object({});

type LiveSchemaResult = AgentToolResult<DescribeLiveSchemaDetails>;

function fail(message: string, needsAuth = false): LiveSchemaResult {
  return {
    content: [{ type: 'text', text: message }],
    details: { success: false, message, ...(needsAuth ? { needsAuth: true } : {}), tables: [] },
  };
}

export const describeLiveSchemaTool: ToolDefinition<
  typeof ParamSchema,
  DescribeLiveSchemaDetails
> = {
  name: 'describe_live_schema',
  label: 'Live schema',
  description:
    'Read the schema the live app data endpoint actually serves, via its `_meta` contract. ' +
    'Unlike describe_schema (the requested state on the control plane), this returns per table the served root field names verbatim ' +
    '(a null operation means it does not exist on the endpoint), fields, relations, and capability blocks (storage, search, i18n, realtime). ' +
    'Call it before hand-writing GraphQL against the app database, after provisioning, or when a query or mutation name seems missing.',
  promptSnippet:
    'describe_live_schema: read the served data-plane schema (verbatim root field names, relations) from live `_meta`.',
  parameters: ParamSchema,
  async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
    const resolved = await resolveProjectContext(ctx.cwd, { plane: 'data' });
    if (!resolved.context) {
      return fail(resolved.reason);
    }
    const { dataEndpoint } = resolved.context;
    if (!dataEndpoint) {
      return fail(
        'Cannot resolve the app data endpoint (DATABASE_NAME missing from .env). Re-provision the database, then retry.',
      );
    }
    // `_meta` answers unauthenticated on current backends; the token only
    // widens what is visible when the endpoint gates reads.
    const token = await resolveDataToken(resolved.context).catch((): { token?: string } => ({ token: undefined }));
    try {
      const tables = await fetchLiveMeta(dataEndpoint, token.token);
      return {
        content: [{ type: 'text', text: formatLiveSchemaText(tables, dataEndpoint) }],
        details: { success: true, endpoint: dataEndpoint, tables },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!token.token) {
        return fail(
          `Reading \`_meta\` from ${dataEndpoint} failed without a data token (${message}). Sign in to the preview app, then retry.`,
          true,
        );
      }
      return fail(`Reading \`_meta\` from ${dataEndpoint} failed: ${message}`);
    }
  },
};
