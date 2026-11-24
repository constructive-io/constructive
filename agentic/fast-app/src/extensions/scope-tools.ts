import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';

import { describeScopeTree, plannedScopeTree } from '../app-spec/scope-tree';
import { CURATED_BLUEPRINTS } from '../blueprints/curated';
import { DatabaseUnusable, loadScopeTree } from './scope-tree-load';

const DescribeScopesSchema = Type.Object({
  blueprint: Type.Optional(
    Type.String({
      description:
        'Before the first build: the curated blueprint slug the AppSpec will use, to see the scopes it adds. Omit once the project has a database.',
    }),
  ),
});

/**
 * describe_scopes: the membership scopes an app can offer screens for
 * (members, invitations, workspaces, an entity's files), read from the live
 * database, or from the blueprint before the first build.
 */
export const scopeTools: ExtensionFactory = (pi) => {
  pi.registerTool({
    name: 'describe_scopes',
    label: 'Describe scopes',
    description:
      "List the database's membership scopes (app, org, and entity types such as data_room) and the AppSpec entries that add screens for them: a workspace switcher between the user's organizations, access pages for members and invitations, and an entity's members and files on its record page. Call it before writing an AppSpec for an app whose users work in teams, organizations or shared spaces.",
    promptSnippet:
      'describe_scopes: the membership scopes, and the opt-in AppSpec screens for members, organizations and shared spaces.',
    parameters: DescribeScopesSchema,
    async execute(_toolCallId, params: { blueprint?: string }, _signal, _onUpdate, ctx) {
      let live: Awaited<ReturnType<typeof loadScopeTree>>;
      try {
        live = await loadScopeTree(ctx.cwd);
      } catch (err) {
        // The project has a database, and its scopes aren't the planned ones.
        const detail = err instanceof Error ? err.message : String(err);
        // A database that can't be used says what to do; a failed read doesn't.
        const next =
          err instanceof DatabaseUnusable
            ? ''
            : ' Check that the Constructive backend is running, then call describe_scopes again.';
        return {
          content: [
            {
              type: 'text',
              text: `describe_scopes couldn't read this database's membership scopes. ${detail.replace(/\.?$/, '.')} Nothing was changed.${next}`,
            },
          ],
          details: { scopes: [], live: false },
        };
      }
      const blueprint = params.blueprint ? CURATED_BLUEPRINTS[params.blueprint] : undefined;
      const tree = live ?? plannedScopeTree(blueprint);
      const source = live
        ? 'From the project database.'
        : blueprint
          ? `Planned for the "${params.blueprint}" blueprint: the project has no database yet.`
          : "The project has no database yet: these are the scopes every app starts with. Pass `blueprint` to add a curated blueprint's entity types.";
      return {
        content: [{ type: 'text', text: `${source}\n${describeScopeTree(tree)}` }],
        details: { scopes: tree.map((info) => info.scope), live: Boolean(live) },
      };
    },
  });
};
