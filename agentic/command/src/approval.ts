import { type ConfirmPrompt, renderPlan } from '@agentic-kit/harness';
import { createHash } from 'crypto';

import { layerError } from './input';
import { type ChangeCommand, CliError, type CommandContext, type CommandErrorCode, type CommandResult, ExitCode } from './types';

/** What the layer does with a planned change, from the flags and the terminal of the run alone. */
export type Approval = 'show-plan' | 'apply' | 'apply-if-same' | 'ask' | 'approval-required';

/**
 * --dry-run shows the plan, --approve <id> applies it only if it is still that plan, --yes approves any plan, a
 * terminal asks, and anything else stops before the change.
 */
export function decideApproval(run: { dryRun: boolean; yes: boolean; interactive: boolean; approve?: string }): Approval {
  if (run.dryRun) return 'show-plan';
  if (run.approve !== undefined) return 'apply-if-same';
  if (run.yes) return 'apply';
  return run.interactive ? 'ask' : 'approval-required';
}

/** The data of a `--dry-run`: nothing was changed, this is what would be, and the id that approves exactly this. */
export interface PlanData {
  applied: false;
  plan: ConfirmPrompt;
  planId: string;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]));
}

/**
 * The id of a plan of a command. The plan is what a person approves, with what it acts on, where and as whom, so the id
 * binds only the command and the plan: a flag that says how a secret arrives (the `needs` of a plan) leaves it as it is.
 */
export function planIdOf(command: string, plan: ConfirmPrompt): string {
  return createHash('sha256').update(JSON.stringify(canonical({ command, plan }))).digest('hex').slice(0, 12);
}

async function confirmed(ctx: CommandContext, plan: ConfirmPrompt): Promise<boolean> {
  const answers = await ctx.prompter.prompt<{ yes?: boolean }>({}, [
    { type: 'confirm', name: 'yes', message: `${renderPlan(plan)}\n\nApply?`, default: false }
  ]);
  return answers.yes === true;
}

/** Plans the change, and applies it only when the run approves that plan: the one approval step of every change. */
export async function runChange(
  command: ChangeCommand,
  input: Record<string, unknown>,
  ctx: CommandContext,
  dryRun: boolean
): Promise<CommandResult<unknown>> {
  const planned = await command.plan(input, ctx);
  const { plan } = planned;
  const planId = planIdOf(command.name, plan);
  const approve = [...(ctx.interactive ? [] : planned.needs ?? []), '--approve', planId];
  const stop = (code: CommandErrorCode, message: string): CliError<CommandErrorCode> => {
    if (ctx.format === 'text') ctx.stderr.write(`${renderPlan(plan)}\n\n`);
    // The command wrote the plan, so the error is not the layer's own text: it is searched for secrets like any other.
    return new CliError<CommandErrorCode>({
      code,
      message,
      hint: 'Show the plan to the person, then run the --approve step.',
      next: [ctx.followUp(approve, { drop: ['yes', 'approve'], why: 'Apply after approval' })],
      exitCode: ExitCode.approvalRequired,
      details: { plan, planId }
    });
  };
  switch (decideApproval({ dryRun, yes: ctx.yes, interactive: ctx.interactive, approve: ctx.approve })) {
  case 'show-plan': {
    const data: PlanData = { applied: false, plan, planId };
    return {
      data,
      text: renderPlan(plan),
      next: [ctx.followUp(approve, { drop: ['dry-run', 'yes', 'approve'], why: 'Apply after approval' })]
    };
  }
  case 'apply-if-same':
    if (ctx.approve === planId) return command.apply(input, planned, ctx);
    throw stop('plan-changed', 'Nothing changed. The plan is no longer the one that was approved.');
  case 'apply':
    return command.apply(input, planned, ctx);
  case 'ask':
    if (await confirmed(ctx, plan)) return command.apply(input, planned, ctx);
    throw layerError({ code: 'cancelled', message: 'Not approved. Nothing changed.', exitCode: ExitCode.failure });
  case 'approval-required':
    throw stop('approval-required', 'Nothing changed. The plan needs approval, and there is no terminal to ask.');
  }
}
