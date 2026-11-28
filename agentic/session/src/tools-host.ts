import type { ToolsHost } from '@agentic-kit/db-tools';

import { openStore, stashBaseDir } from './account-store';
import { agentSession } from './agent';
import { agentBinding, hostAccount, hostBackendConfig, type PersonSession, resolveSession, sessionProblem } from './session';

/**
 * The `configureHost` input of `@agentic-kit/db-tools`. Each call resolves the
 * session again, so a sign-in mid-session, or an agent token another process
 * minted, is picked up without a restart, and each answer comes from one
 * resolution. Absence is null (no account) or undefined (no backend). A
 * session that cannot be used, and a store that cannot be read, throw their
 * cause from both getters, so the tools report it whichever they read first.
 * A stored session another backend issued throws from `account()` only, since
 * the backend itself is usable.
 *
 * With `agent`, the host acts as that agent of the person: `account()` is
 * asynchronous, and gives an access token minted with the agent's key when the
 * cached one is near its end.
 */
export function sessionToolsHost({
  signInHint,
  repairHint,
  context,
  env,
  agent
}: {
  signInHint: string;
  /** The command that stores a complete context, for the `incomplete-backend` message. */
  repairHint?: string;
  context?: string;
  env?: NodeJS.ProcessEnv;
  agent?: string;
}): ToolsHost {
  const person = (): PersonSession => {
    const session = resolveSession({ context, env });
    const problem = session.kind === 'issuer-mismatch' ? null : sessionProblem(session, repairHint);
    if (problem) throw new Error(problem);
    return session;
  };
  const agentAccount = async () => {
    const stash = env ?? process.env;
    const session = await agentSession({ store: openStore(stashBaseDir(stash)), name: agent, context, env: stash });
    const problem = sessionProblem(session, repairHint);
    if (problem) throw new Error(problem);
    return session.kind === 'signed-in' ? hostAccount(session) : null;
  };
  return {
    account() {
      if (agent !== undefined) return agentAccount();
      const session = person();
      if (session.kind === 'issuer-mismatch') throw new Error(sessionProblem(session));
      return session.kind === 'signed-in' ? hostAccount(session) : null;
    },
    backendConfig() {
      if (agent !== undefined) {
        const bound = agentBinding({ context, env, agent });
        if (bound.kind === 'bound') return hostBackendConfig(bound.backend);
        const problem = sessionProblem(bound, repairHint);
        if (problem) throw new Error(problem);
        return undefined;
      }
      const session = person();
      return session.kind === 'signed-in' || session.kind === 'signed-out' || session.kind === 'issuer-mismatch' ? hostBackendConfig(session.backend) : undefined;
    },
    signInHint
  };
}
