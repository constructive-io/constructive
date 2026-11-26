import { type ConfirmPrompt, renderPlan } from '@agentic-kit/harness';

import { layerError } from './input';
import { type ChangeCommand, CliError, type CommandContext, type CommandErrorCode, type CommandResult, ExitCode } from './types';

/** What the layer does with a planned change, from the flags and the terminal of the run alone. */
export type Approval = 'show-plan' | 'apply' | 'ask' | 'approval-required';

/** --dry-run shows the plan, --yes approves it, a terminal asks, and anything else stops before the change. */
export function decideApproval(run: { dryRun: boolean; yes: boolean; interactive: boolean }): Approval {
  if (run.dryRun) return 'show-plan';
  if (run.yes) return 'apply';
  return run.interactive ? 'ask' : 'approval-required';
}

/** The data of a `--dry-run`: nothing was changed, and this is what would be. */
export interface PlanData {
  applied: false;
  plan: ConfirmPrompt;
}

async function confirmed(ctx: CommandContext, plan: ConfirmPrompt): Promise<boolean> {
  const answers = await ctx.prompter.prompt<{ yes?: boolean }>({}, [
    { type: 'confirm', name: 'yes', message: `${renderPlan(plan)}\n\nApply this change?`, default: false }
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
  const approve = [...(ctx.interactive ? [] : planned.needs ?? []), '--yes'];
  switch (decideApproval({ dryRun, yes: ctx.yes, interactive: ctx.interactive })) {
  case 'show-plan': {
    const data: PlanData = { applied: false, plan };
    return {
      data,
      text: renderPlan(plan),
      next: [ctx.followUp(approve, { drop: ['dry-run', 'yes'], why: 'Apply the change once the person approves the plan' })]
    };
  }
  case 'apply':
    return command.apply(input, planned, ctx);
  case 'ask':
    if (await confirmed(ctx, plan)) return command.apply(input, planned, ctx);
    throw layerError({ code: 'cancelled', message: 'The change was not approved, so nothing was changed.', exitCode: ExitCode.failure });
  case 'approval-required':
    if (ctx.format === 'text') ctx.stderr.write(`${renderPlan(plan)}\n\n`);
    // The command wrote the plan, so the error is not the layer's own text: it is searched for secrets like any other.
    throw new CliError<CommandErrorCode>({
      code: 'approval-required',
      message: 'This change needs approval, and prompts are off, so nothing was changed.',
      hint: 'Show the plan to the person. When they approve it, run the same command with --yes.',
      next: [ctx.followUp(approve, { drop: ['yes'], why: 'Apply the change once the person approves the plan' })],
      exitCode: ExitCode.approvalRequired,
      details: { plan }
    });
  }
}
