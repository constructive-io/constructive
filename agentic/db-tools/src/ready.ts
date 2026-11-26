// What a tool resolves before it changes anything. A tool runs its check first
// and stops with the failure; the gate runs the very same check
// (`toolPreconditions` in ./tools) and blocks the call with that failure, so
// the gate and the tool cannot disagree about whether a call can run.

import type { PlanTarget } from '@agentic-kit/harness';

import { type ProjectContext, resolveDataToken, resolveProjectContext } from './context';
import { MISSING_OWNER, type Result } from './failure';

const accountOf = (context: ProjectContext) => ({
  userId: context.accountUserId,
  ...(context.accountEmail ? { email: context.accountEmail } : {}),
  ...(context.accountAgent ? { agent: context.accountAgent } : {}),
});

/** The bound database a change goes to, at the backend and as the account the context resolved. */
export function databaseTarget(context: ProjectContext, appUserId?: string): PlanTarget {
  return {
    kind: 'database',
    database: { name: context.databaseName, id: context.databaseId },
    apiEndpoint: context.controlApiEndpoint,
    account: accountOf(context),
    ...(appUserId ? { appUserId } : {}),
  };
}

/** A change to what the account owns beside its databases (its templates), at the context's backend. */
export function accountTarget(context: ProjectContext): PlanTarget {
  return { kind: 'account', apiEndpoint: context.controlApiEndpoint, account: accountOf(context) };
}

/** The project context of `cwd`, on the plane the tool acts on. */
export async function projectReady(cwd: string, plane: 'control' | 'data' = 'control'): Promise<Result<ProjectContext>> {
  const resolved = await resolveProjectContext(cwd, { plane });
  return resolved.context ? { kind: 'ok', value: resolved.context } : { kind: 'failed', failure: resolved.failure };
}

/** The control-plane context of a project whose binding names its owner. */
export async function ownedProjectReady(cwd: string): Promise<Result<ProjectContext & { ownerId: string }>> {
  const ready = await projectReady(cwd);
  if (ready.kind === 'failed') return ready;
  const { ownerId } = ready.value;
  return ownerId ? { kind: 'ok', value: { ...ready.value, ownerId } } : { kind: 'failed', failure: MISSING_OWNER };
}

/** A data-plane token of the person signed in to the app. */
export async function appSessionReady(context: ProjectContext): Promise<Result<{ token: string; userId?: string }>> {
  const token = await resolveDataToken(context);
  return token.token
    ? { kind: 'ok', value: { token: token.token, userId: token.userId } }
    : { kind: 'failed', failure: token.failure };
}
