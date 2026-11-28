import type { CommandErrorCode } from '@agentic-kit/command';
import type { ToolFailureCode } from '@agentic-kit/harness';

/**
 * The failure codes only this CLI answers, each with its exit code and one sentence: what it means for the caller,
 * and what to do. The tools (`TOOL_FAILURE_MEANINGS`) and the command layer (`COMMAND_ERROR_CODES`) say their own.
 */
export const CLI_ERROR_CODES = {
  'agent-conflict': { exit: '2', meaning: '--as names an agent while a CONSTRUCTIVE_* credential or endpoint variable is set, so nothing ran: unset the variable, or leave out --as.' },
  'agent-unusable': {
    exit: '4, or 1 when no access token could be minted for a moment',
    meaning:
      'The agent cannot act now: its key ended or was refused, its context names another backend, or no token could be minted (retryable; the key is unchanged). ' +
      'meta.next holds the steps you take without --as: agent renew, or agent remove and agent add.'
  },
  'backend-error': { exit: '1', meaning: 'The backend failed during the sign-in: retry later, and tell its operator if it lasts.' },
  'context-conflict': { exit: '2', meaning: '--context names a context while a CONSTRUCTIVE_* variable chooses another backend, so nothing ran: unset the variable, or leave out --context.' },
  'context-in-use': {
    exit: '1',
    meaning:
      'The command would drop a credential that is still valid, so nothing changed. meta.next ends it first: logout --context <name> before context add, ' +
      'or agent remove <name> for each agent in error.details.agents before context remove. Or store the backend under another --name.'
  },
  'credential-rejected': { exit: '4', meaning: 'The backend rejected the stored credential (revoked, or ended early): sign in again with login.' },
  'incomplete-backend': { exit: '1', meaning: 'The context lacks the endpoint of a plane (Desktop may have stored it), so nothing ran: the step adds it again with every plane.' },
  'invalid-binding': {
    exit: '2',
    meaning: 'An entry of the binding in .env is not valid (error.details.variable names it), so nothing ran and its value is not shown: run the step in meta.next, or fix or remove the line.'
  },
  'invalid-credentials': { exit: '4', meaning: 'The email or the password is wrong: check both, then sign in again.' },
  'invalid-override': { exit: '2', meaning: 'A CONSTRUCTIVE_* variable is set wrong, or without the one it needs (error.details.variable names it), so nothing ran: fix or unset it.' },
  'not-a-person': { exit: '2', meaning: 'The stored sign-in is a principal\'s, and only a person adds or changes agents: sign in as the person.' },
  'second-factor-required': { exit: '4', meaning: 'The account needs a second factor, which this CLI cannot give yet: sign in through the app.' },
  'sign-in-refused': { exit: '1', meaning: 'The backend refused the sign-in, for the reason its message gives (a locked account, for example): wait, or ask an administrator.' },
  'unknown-agent': { exit: '2', meaning: 'You have no agent with the name --as gives under this context, so nothing ran: run agent list, or add the agent.' },
  'unknown-context': { exit: '2', meaning: '--context names no stored context, so nothing ran: the message lists the known ones.' },
  'unsafe-path': {
    exit: '1',
    meaning: 'A write would go through a symbolic link that leaves the directory or points nowhere, so nothing was written: replace or remove the link in error.details.link.'
  }
} as const satisfies Record<string, { exit: string; meaning: string }>;

/** Every code a CliError of this CLI may carry: its own, the command layer's, or a tool's. A new one needs its sentence to compile. */
export type CliCode = keyof typeof CLI_ERROR_CODES | CommandErrorCode | ToolFailureCode;
