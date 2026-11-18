// verify_app: the same checks the pipeline ends with, for a repair turn
// (fast-app/verify-pipeline.ts runs them). It holds the project's build slot
// while it runs, and commits the chat's changes when the check passes.

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';

import { touchedFiles } from '../pipeline/touched-files';
import { runVerifyPipeline, verifyProgress } from '../pipeline/verify-pipeline';
import { type BuildResult, phaseReporter, textResult, withBuildSlot } from './context';

export function registerVerifyAppTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: 'verify_app',
    label: 'Verify app',
    description:
      'Check the app after you changed it: tsc, every page returns 200 from the dev server, every signed-in page loads its data with no GraphQL error or uncaught exception, and create → get → update → delete on every table through the generated ORM as the owner. Returns each failure with its file, route or table. When it passes and files changed, it commits them with commit_message.',
    promptSnippet:
      'verify_app: re-run the app checks (types, routes, page data, CRUD) after a change; commits what passed.',
    parameters: Type.Object({
      commit_message: Type.Optional(
        Type.String({
          description:
            'A conventional commit message for the changes this check covers, e.g. "feat(app): add calendar, staffing and hours pages". Used when the check passes and files changed.',
        }),
      ),
    }),
    executionMode: 'sequential',
    async execute(toolCallId, params, signal, onUpdate, ctx): Promise<BuildResult> {
      const progress = verifyProgress(phaseReporter(pi, toolCallId, onUpdate));
      return withBuildSlot(ctx, progress, 'verify_app', async ({ services, project }) => {
        const { text, details } = await runVerifyPipeline(
          {
            cwd: ctx.cwd,
            services,
            project,
            signal,
            commitMessage: params.commit_message,
            touchedFiles: () => touchedFiles(ctx.sessionManager.getEntries(), ctx.cwd),
          },
          progress,
        );
        return textResult(text, details);
      });
    },
  });
}
