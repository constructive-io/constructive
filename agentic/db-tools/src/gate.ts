import type { ConstructiveGateDeps } from '@agentic-kit/harness';

import {
  type ProjectContext,
  resolveDataToken as defaultResolveDataToken,
  resolveProjectContext as defaultResolveProjectContext,
} from './context';
import { createTemplatePreviewTables as defaultCreateTemplatePreviewTables } from './tools/templates';

/** The resolvers the deps are built from, so a test can substitute fakes. */
export type ConstructiveGateResolvers = {
  resolveProjectContext: typeof defaultResolveProjectContext;
  resolveDataToken: typeof defaultResolveDataToken;
  createTemplatePreviewTables: typeof defaultCreateTemplatePreviewTables;
};

/**
 * The Constructive gate's host capabilities, answered by this package's own
 * project/token/template resolvers.
 *
 * Every adapter gates the same tools against the same project state, so the
 * mapping lives here rather than once per harness — an adapter's job is only
 * to hand its harness's confirm surface to the gate.
 */
export function constructiveGateDeps(
  resolvers: Partial<ConstructiveGateResolvers> = {}
): ConstructiveGateDeps {
  const resolveProjectContext = resolvers.resolveProjectContext ?? defaultResolveProjectContext;
  const resolveDataToken = resolvers.resolveDataToken ?? defaultResolveDataToken;
  const createTemplatePreviewTables =
    resolvers.createTemplatePreviewTables ?? defaultCreateTemplatePreviewTables;

  const context = async (cwd: string): Promise<ProjectContext | null> =>
    (await resolveProjectContext(cwd)).context;

  return {
    isProjectRunnable: async (cwd) => (await context(cwd)) !== null,

    hasDataToken: async (cwd) => {
      const resolved = await context(cwd);
      if (!resolved) return false;
      return Boolean((await resolveDataToken(resolved)).token);
    },

    resolveTemplatePreview: async (cwd, blueprintName, displayName) => {
      const resolved = await context(cwd);
      if (!resolved) return undefined;
      const result = await createTemplatePreviewTables(resolved, blueprintName);
      if (result.tables.length === 0) return undefined;
      return {
        kind: 'template',
        displayName,
        blueprintName: result.blueprintName || undefined,
        tables: result.tables,
      };
    },
  };
}
