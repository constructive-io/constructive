import type { CommandErrorCode } from '@agentic-kit/command';
import type { ToolFailureCode } from '@agentic-kit/harness';

/**
 * The failure codes only this CLI answers, each with its exit code and one sentence: what it means for the caller,
 * and what to do. The tools (`TOOL_FAILURE_MEANINGS`) and the command layer (`COMMAND_ERROR_CODES`) say their own.
 */
export const CLI_ERROR_CODES = {
  'agent-conflict': {
    exit: '2',
    meaning: 'The run names an agent with --as while a CONSTRUCTIVE_* credential or endpoint variable is set, so it cannot tell whose credential to use and nothing ran: unset the variable, or leave out --as.'
  },
  'agent-unusable': {
    exit: '4, or 1 when no access token could be minted for a moment',
    meaning:
      'The agent --as names cannot act now: its key has ended or was refused, its context now names another backend, or no access token could be minted. ' +
      'A mint that failed is retryable (run the command again; the key is unchanged). Otherwise meta.next holds the steps the person takes without --as: ' +
      'agent renew for a key that ended, or agent remove and agent add for another backend.'
  },
  'backend-error': { exit: '1', meaning: 'The backend failed while it signed the person in: retry later, and tell the backend operator when it lasts.' },
  'context-conflict': {
    exit: '2',
    meaning: '--context names a context while a CONSTRUCTIVE_* variable chooses another backend, so nothing ran: unset the variable, or leave out --context.'
  },
  'context-in-use': {
    exit: '1',
    meaning:
      'The context holds a credential that the command would drop while it stays valid, so nothing changed. ' +
      'For context add, a session the new endpoints did not issue: meta.next signs out of that context first (logout --context <name>, which revokes the key), then runs the same context add again; or store the backend under another --name. ' +
      'For context remove, agents with stored keys (error.details.agents): meta.next removes each agent first (agent remove <name>, which ends its key), then runs the same context remove again.'
  },
  'credential-rejected': { exit: '4', meaning: 'The backend rejected the stored credential (it was revoked or ended early): the person signs in again with login.' },
  'incomplete-backend': {
    exit: '1',
    meaning: 'The context lacks the endpoint of a plane (for example one that Desktop stored), so nothing ran: the step adds the context again with every plane.'
  },
  'invalid-binding': {
    exit: '2',
    meaning:
      'An entry of the project binding in .env is not valid (error.details.variable names it, for example a CONSTRUCTIVE_AGENT that is not an agent name), so nothing ran, and its value is not shown: ' +
      'write it again with the command in meta.next, or fix or remove the line.'
  },
  'invalid-credentials': { exit: '4', meaning: 'The email or the password is wrong: check both, then sign in again.' },
  'invalid-override': {
    exit: '2',
    meaning: 'A CONSTRUCTIVE_* environment variable is set wrong, or without the one it needs (error.details.variable names it), so nothing ran: fix or unset it, as the hint says.'
  },
  'not-a-person': { exit: '2', meaning: 'The stored sign-in is a principal\'s, not a person\'s, and only a person adds or changes agents: sign in as the person.' },
  'second-factor-required': { exit: '4', meaning: 'The account needs a second factor, which this CLI cannot give yet: sign in through the app.' },
  'sign-in-refused': { exit: '1', meaning: 'The backend refused the sign-in for the reason its message gives, for example a locked account: wait, or ask an administrator.' },
  'unknown-agent': {
    exit: '2',
    meaning: 'No agent of the person has the name --as gives under this context, so nothing ran: run agent list, or add the agent as the person.'
  },
  'unknown-context': {
    exit: '2',
    meaning: '--context names no stored context, so nothing ran: the message lists the known ones, and context add adds a backend.'
  },
  'unsafe-path': {
    exit: '1',
    meaning:
      'A write would go through a symbolic link that leaves the directory or points nowhere, so nothing was written: ' +
      'error.details.link names the link; replace it with a real file or directory, or remove it.'
  }
} as const satisfies Record<string, { exit: string; meaning: string }>;

/** Every code a CliError of this CLI may carry: its own, the command layer's, or a tool's. A new one needs its sentence to compile. */
export type CliCode = keyof typeof CLI_ERROR_CODES | CommandErrorCode | ToolFailureCode;
