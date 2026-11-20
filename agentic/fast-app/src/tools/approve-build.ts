// The plan card and the rebuild card, from the ask to the build: the host
// shows the card and waits for the user's answer, the build runs the plan as
// approved, and the host finishes its part once the build ended (desktop
// keeps the password when its box stayed ticked). plan-app-tool.ts and
// rebuild-app.ts say what the card shows.

import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

import type { AppPlanPrompt } from '../pipeline/app-plan';
import { type BuildPlan, resolvePlan } from '../pipeline/build-plan';
import { type CardRequest, type FastAppAccount, getFastAppHost } from '../pipeline/host';
import { type PipelineResult, runPipeline } from '../pipeline/pipeline';
import { approvedPlan } from '../pipeline/plan-summary';
import type { BuildProgress, StageEntry } from '../pipeline/progress';
import type { BuildSlot } from './context';

export type PlanAppCall = {
  toolCallId: string;
  /** Only validation makes an AppSpec of them. */
  params: unknown;
  signal: AbortSignal | undefined;
  ctx: ExtensionContext;
};

/** The signed-in platform account, whose password the card asks for. */
export type Account = FastAppAccount;

/** The card's account row, as the host has it for the project. */
export function cardAccount(slot: BuildSlot, account: Account): Promise<AppPlanPrompt['account']> {
  return getFastAppHost().card.account(slot.project?.id, account);
}

export type CardAsk = {
  account: Account;
  /** The destructive changes the user can tick; a rebuild card has none. */
  destructive: CardRequest['destructive'];
  /** The card's approval stage, as its database row says it. */
  stage: Extract<StageEntry, { stage: 'approval' }>;
  request: Pick<CardRequest, 'title' | 'message' | 'card'>;
  /** The plan the build card keeps once approved, before the ticked changes fold in. */
  built: AppPlanPrompt;
};

export type CardOutcome =
  | { kind: 'declined'; reason: string | undefined }
  | { kind: 'built'; result: PipelineResult };

/** Asks on the card, then builds what the user approved; a declined card builds nothing. */
export async function approveAndBuild(
  call: PlanAppCall,
  slot: BuildSlot,
  progress: BuildProgress,
  plan: BuildPlan,
  ask: CardAsk,
): Promise<CardOutcome> {
  progress.enter(ask.stage);
  // The build's timing marks the wait.
  const answer = await progress.waitForApproval(() =>
    getFastAppHost().card.ask({
      chatId: slot.chatId,
      toolCallId: call.toolCallId,
      projectId: slot.project?.id,
      account: ask.account,
      ...ask.request,
      destructive: ask.destructive,
      signal: call.signal,
    }),
  );
  if (answer.approved === false) {
    progress.enter({ stage: 'declined' });
    return { kind: 'declined', reason: answer.reason };
  }

  const ticked = answer.destructive;
  // The card keeps the plan as approved, folded over the build's steps.
  progress.set({ plan: approvedPlan(ask.built, ticked) });
  // An unticked removal stays in the database, so it goes back into the spec, hidden.
  const result = await runPipeline(
    {
      cwd: call.ctx.cwd,
      plan,
      resolved: resolvePlan(plan, ticked),
      credential: answer.credential,
      services: slot.services,
      projectId: slot.project?.id,
      signal: call.signal,
    },
    progress,
  );
  await answer.afterBuild?.();
  return { kind: 'built', result };
}
