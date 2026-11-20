import type {
  AgentToolResult,
  ExtensionAPI,
  ExtensionContext,
} from '@earendil-works/pi-coding-agent';

import type { AppBuildDetails, PhaseName } from '../pipeline/app-plan';
import type { FastAppProject, FastAppServices } from '../pipeline/host';
import { getFastAppHost } from '../pipeline/host';
import { PHASE_ENTRY_TYPE } from '../pipeline/phases';
import type { BuildProgress, PhaseReporter } from '../pipeline/progress';
import { acquireForBuild } from '../pipeline/project-lock';
import {
  APP_BUILDING_UNAVAILABLE,
  BUILD_RUNNING,
  CHECK_RUNNING,
  noChatText,
  SERVICES_NOT_READY,
  STOPPED,
} from '../pipeline/result-text';

export type BuildResult = AgentToolResult<AppBuildDetails>;

export const textResult = (text: string, details: AppBuildDetails): BuildResult => ({
  content: [{ type: 'text', text }],
  details,
});

// The host knows which chat the session a tool runs in belongs to.
export function findChatId(ctx: ExtensionContext): string | null {
  return getFastAppHost().chatId(ctx.sessionManager.getSessionFile());
}

export function findProject(cwd: string): FastAppProject | undefined {
  return getFastAppHost().projects.at(cwd);
}

export type BuildSlot = {
  services: FastAppServices;
  chatId: string;
  project: FastAppProject | undefined;
};

/**
 * What both tools check before they touch the project: the services are up,
 * this build has an app template, the call's chat is known, and no other
 * build holds the project. A chat's database check that holds it is waited
 * for, up to 30 s. An exit here ends the card as failed, so it never reads as
 * a build or a check that passed. The lock is held while `run` runs, from the
 * card to the commit. Stop ends the wait for a check at once.
 */
export async function withBuildSlot(
  ctx: ExtensionContext,
  progress: BuildProgress,
  tool: 'plan_app' | 'verify_app',
  run: (slot: BuildSlot) => Promise<BuildResult>,
): Promise<BuildResult> {
  const exit = (cause: string, fix: string, text: string) => {
    progress.fail('setup', cause, fix);
    return textResult(text, progress.details);
  };
  const services = getFastAppHost().services();
  if (!services) {
    return exit(
      'The fast app services are not ready yet.',
      'Try again in a moment.',
      SERVICES_NOT_READY,
    );
  }
  if (!services.template.available()) {
    return exit(
      "App building isn't available in this build: it has no app template.",
      "Tell the user, and don't try to build the app another way.",
      APP_BUILDING_UNAVAILABLE,
    );
  }
  const chatId = findChatId(ctx);
  if (!chatId)
    return exit(`${tool} could not find its chat.`, 'Ask the user to retry.', noChatText(tool));
  // The agent's abort signal while it streams: Stop aborts it.
  const release = await acquireForBuild(services.locks, ctx.cwd, { signal: ctx.signal });
  if (release === 'stopped') {
    progress.enter({ stage: 'stopped' });
    return textResult(STOPPED, progress.details);
  }
  if (release === 'check') {
    return exit(
      'The database check is still running; the backend is slow.',
      'Try again in a moment.',
      CHECK_RUNNING,
    );
  }
  if (release === 'build') {
    return exit(
      'A build is already running in this project.',
      'Wait for it to finish, then try again.',
      BUILD_RUNNING,
    );
  }
  try {
    return await run({ services, chatId, project: findProject(ctx.cwd) });
  } finally {
    release();
  }
}

const PHASE_WORDS: Record<PhaseName, string> = {
  setup: 'Starting',
  approval: 'Waiting for approval',
  provision: 'Creating the database',
  schema: 'Building the schema',
  codegen: 'Generating the SDK',
  seed: 'Adding sample rows',
  gen: 'Generating screens',
  dev: 'Starting the dev server',
  verify: 'Verifying',
  commit: 'Committing',
};

export function progressText(details: AppBuildDetails): string {
  const running = details.phases.find((p) => p.status === 'running');
  if (details.stage === 'approval')
    return `Waiting for the user to approve building ${details.name}.`;
  if (running) return `${PHASE_WORDS[running.phase]}…`;
  return details.stage;
}

/** The marks go into the session, the details to the tool's updates, and both to the host's watch. */
export function phaseReporter(
  pi: ExtensionAPI,
  toolCallId: string,
  onUpdate: ((result: BuildResult) => void) | undefined,
): PhaseReporter {
  const watch = getFastAppHost().progress?.(toolCallId, (customType, data) =>
    pi.appendEntry(customType, data),
  );
  return {
    mark: (mark) => {
      pi.appendEntry(PHASE_ENTRY_TYPE, mark);
      watch?.mark?.(mark);
    },
    update: (details) => {
      onUpdate?.({ content: [{ type: 'text', text: progressText(details) }], details });
      watch?.update?.(details);
    },
  };
}
