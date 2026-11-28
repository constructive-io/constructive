import { COMMAND_ERROR_CODES, type CommandDefinition, ExitCode, type HelpTopic } from '@agentic-kit/command';
import { ARCHIVED_BINDING_KEYS } from '@agentic-kit/db-tools';
import { alignColumns, TOOL_FAILURE_CODES, TOOL_FAILURE_MEANINGS } from '@agentic-kit/harness';
import { STASH_DIR_ENV, STASH_NAME } from '@agentic-kit/session';

import { OWNER_NODE, OWNER_ONLY_RULE, RULE_SHAPE } from './commands/access';
import { HOST_SETUP, SHELL_LIMIT, SKILLS, WRITES_BY_HAND } from './commands/setup';
import { CLI_ERROR_CODES } from './errors';
import { AGENT_BINDING_KEY, CLI_NAME } from './session';

const code = (text: string): string => `\`${text}\``;

const list = (items: string[]): string => items.map((item) => `- ${item}`).join('\n');

const and = (items: string[]): string => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

const names = (commands: CommandDefinition[]): string => and(commands.map((command) => code(command.name)));

const hosts = Object.values(HOST_SETUP);

/** A block that a terminal shows as it is: a table or a diagram, aligned in a monospace font. */
const block = (lines: string[]): string => ['```', ...lines, '```'].join('\n');

const table = (rows: string[][]): string => block(alignColumns(rows));

const ENVIRONMENT = `These variables take the place of the store, for CI and isolated runs, or change how a command runs:

${table([
    ['VARIABLE', 'WHAT IT DOES'],
    ['CONSTRUCTIVE_API_ENDPOINT', 'names the backend; an api.<host> endpoint gives the others (auth.<host>, ...)'],
    ['CONSTRUCTIVE_AUTH_ENDPOINT', 'sets that one endpoint; needs CONSTRUCTIVE_API_ENDPOINT'],
    ['CONSTRUCTIVE_MODULES_ENDPOINT', 'sets that one endpoint; needs CONSTRUCTIVE_API_ENDPOINT'],
    ['CONSTRUCTIVE_AGENT_ENDPOINT', 'sets that one endpoint; needs CONSTRUCTIVE_API_ENDPOINT'],
    ['CONSTRUCTIVE_COMPUTE_ENDPOINT', 'sets that one endpoint; needs CONSTRUCTIVE_API_ENDPOINT'],
    ['CONSTRUCTIVE_USER_ID', 'with CONSTRUCTIVE_ACCESS_TOKEN: an account for CI, in place of a session'],
    ['CONSTRUCTIVE_ACCESS_TOKEN', 'the access token of that account'],
    ['CONSTRUCTIVE_API_KEY', 'optional: the API key of that account'],
    [STASH_DIR_ENV, `keeps the store in <dir>/.${STASH_NAME}/, and turns off the update check`],
    ['CI', 'turns prompts off, as --no-input does, and the update check'],
    ['DEBUG', 'adds the stack trace of an unexpected error']
  ])}

\`server\` reads the Postgres variables (\`PGHOST\`, \`PGPORT\`, \`PGUSER\`, \`PGPASSWORD\`, \`PGDATABASE\`) for the database it serves.

A backend whose api host does not start with \`api.\` needs all four endpoint variables. The CI account needs \`CONSTRUCTIVE_API_ENDPOINT\`, so its credential goes only to that backend. A stored session goes only to the backend it was signed in to, never to one that \`CONSTRUCTIVE_API_ENDPOINT\` names, unless that is exactly the backend of its context.

A variable set wrong, or without the one it needs, stops every command with \`invalid-override\` (exit 2). \`--context\` with a variable that chooses another backend is \`context-conflict\`, and \`--as\` with any \`CONSTRUCTIVE_*\` credential or endpoint variable is \`agent-conflict\` (both exit 2): the run cannot tell whose credential to use.`;

const EXIT_CODES = `Every command exits with one of these codes:

${table([
    ['CODE', 'MEANING', 'NEXT STEP'],
    [String(ExitCode.ok), 'done', ''],
    [String(ExitCode.failure), 'failed', 'error.code says why; meta.next holds the steps'],
    [String(ExitCode.usage), 'bad input; nothing ran', '<command> --schema'],
    [String(ExitCode.approvalRequired), 'needs approval; nothing changed', 'show error.details.plan, then run the --approve step'],
    [String(ExitCode.signInRequired), 'sign in first', 'meta.next holds the sign-in step'],
    [String(ExitCode.interrupted), 'interrupted (Ctrl-C)', 'a change may be partly made: check the state first']
  ])}

A failure also has a code: \`error.code\` in JSON, and \`Error (<code>)\` in text. A code means the same in every command.

The codes of the command line:

${list(Object.entries(COMMAND_ERROR_CODES).map(([name, meaning]) => `${code(name)}: ${meaning}`))}

The codes of the sign-in, the contexts, the agents and the project binding:

${list(Object.entries(CLI_ERROR_CODES).map(([name, { exit, meaning }]) => `${code(name)} (exit ${exit}): ${meaning}`))}

The codes of the database tools, in the database commands and the MCP tools:

${list(TOOL_FAILURE_CODES.map((name) => `${code(name)}: ${TOOL_FAILURE_MEANINGS[name]}`))}`;

function output(commands: CommandDefinition[]): string {
  const own = commands.filter((command) => 'passthrough' in command);
  const serve = commands.filter((command) => 'serve' in command);
  return `On a terminal, a command prints text, then a \`Next:\` block of the commands to run next; warnings and errors go to stderr. Without a terminal, or with \`--json\`, it prints one JSON envelope on stdout:

${list([
    'Success: `{"ok": true, "data": ..., "meta": {"command": ..., "next": [...], "warnings": [...]}}`',
    `Failure: \`{"ok": false, "error": {"code": ..., "message": ..., "cause": ..., "hint": ..., "retryable": ..., "details": ...}, "meta": {"command": ..., "next": [...]}}\`. \`${CLI_NAME} help exit-codes\` lists the codes.`
  ])}

\`--format text\` prints text without a terminal. \`--fields id,owner.name\` keeps only these paths of \`data\`, in each item of a list too. On a read, a path that matches nothing fails with \`invalid-input\`; after a change it is only a warning.

Each step in \`meta.next\` has \`command\` (quoted for POSIX shells), \`argv\` (the exact words, the CLI name first), \`placeholders\` (the words of \`argv\` to replace first, such as \`<name>\`) and \`why\`. A step keeps \`--context\`, \`--as\` and \`--cwd\`, so it acts on the same backend, as the same agent, in the same directory.

${names(own)} take their own flags and print their own output. ${names(serve)} keeps stdout for its protocol, so its errors go to stderr.

\`--help\`, \`--version\`, \`--schema\` and \`--llms\` print to stdout: \`--schema\` the input and output JSON Schema of a command, \`--llms\` a Markdown index for agents, and \`--llms --json\` the full manifest.

A command never prompts without a terminal, with \`--no-input\` or \`--tty false\`, or when \`CI\` is set: a missing value fails with \`missing-input\` (exit 2), and \`error.details.missing\` names the flags. \`--input '<json>'\`, \`--input @file.json\` or \`--input -\` gives the whole input as JSON; flags override its keys.`;
}

function approval(commands: CommandDefinition[]): string {
  const atOnce = commands.filter((command) => 'immediate' in command);
  const ownWrites = commands.filter((command) => 'passthrough' in command && command.effect !== 'read');
  const serve = commands.filter((command) => 'serve' in command);
  return `A command's effect is \`read\`, \`write\` or \`destructive\` (it can lose data). Every write or destructive command has a plan, except the few below, and the command line runs the approval, so no command can skip it:

${block([
    'command -> plan -+-> --dry-run ........ print the plan and its id, change nothing',
    '                 +-> terminal ......... ask: y applies, n cancels (exit 1)',
    '                 +-> --approve <id> ... apply, while the plan has that id',
    '                 +-> --yes, -y ........ apply any plan',
    '                 +-> no terminal ...... stop: exit 3, the plan in error.details.plan'
  ])}

After a dry run or an exit 3, the step in \`meta.next\` is the same command with \`--approve <id>\`, where the id (\`error.details.planId\`) names that plan: show the plan to the person first. The step applies the change only while the plan is the same; if anything changed since, it stops with \`plan-changed\` and the new plan, for the person to see. \`--yes\` applies whatever the plan is now, for a script that shows no plan to anyone. When the change needs a secret, such as your password for a new agent key, the step without a terminal adds \`--password-stdin\`, so the secret is piped in and never given as a flag value.

These change at once, with no plan, and refuse \`--dry-run\`: ${names(atOnce)}. They change only your own sign-in or stored contexts, or narrow what an agent may do. ${names(ownWrites)} takes its own flags, so it has no plan either. ${names(serve)} serves the tools to an agent host, which asks you before each change (\`${CLI_NAME} help agents\`).`;
}

function agents(): string {
  const asking = hosts.filter((host) => host.asksBeforeWrites).map((host) => host.label);
  const others = hosts.filter((host) => !host.asksBeforeWrites).map((host) => host.label);
  return `An agent is an identity of its own for a program that works for you: a principal of yours on the backend, with its own key in your store, which only you can read. No command prints a key or a token.

${block([
    'you ---(login)-------> your API key (30 days)',
    ' |',
    ' +----(agent add)----> agent principal ---(its key, 30 days)---> access token (15 min)',
    '                            |',
    `                            +-- used by --as <name>, and by ${CLI_NAME} mcp --as <name>`
  ])}

${list([
    '`agent add <name>` adds one, after you approve its plan. The key needs a fresh sign-in, so it asks for your password, or reads it from stdin with `--password-stdin`. By default the agent may read the schema and the access of every database of your organizations, and may not change the schema; `--organization <id>` holds it to one organization, and `--allow-schema-changes` lets it change the schema.',
    'Whoever holds the key acts as the agent until the key ends, you renew it, or you remove the agent. `agent list` shows when each key ends.',
    '`agent renew <name>` gives it a new 30-day key for the same principal, so it keeps its grants, and revokes the old key. It asks for your password too.',
    '`agent grant <name> --schema-changes` lets it add, change and delete tables, fields, relations and rules (a delete loses data). It widens what the agent may do, so it has a plan. `agent revoke <name> --schema-changes` stops that at once.',
    '`agent remove <name>` deletes the principal, which ends its key and tokens at once. `logout` does not: each agent keeps its key until it ends or you remove the agent.'
  ])}

A command acts as you unless it says \`--as <name>\`. Then it acts as that agent, and every next step keeps \`--as\`; \`whoami\` and \`status\` say which agent acts, what it may do and when its key ends. \`login\`, \`logout\`, the \`context\` commands and the \`agent\` commands always act as you. ${SHELL_LIMIT}

${list([
    'When the backend refuses the agent\'s token before it ends, a read or a plan gets one new token and runs again. A change that is being applied does not run again by itself, since part of it may be made: it fails with `signed-out` (exit 1, retryable).',
    'A key that ended, or a second refusal, is `agent-unusable` (exit 4), and the step is `agent renew <name>`, which you run as yourself. A token that could not be minted for a moment is `agent-unusable` with exit 1, retryable.',
    'A change the backend refuses because the agent may not change the schema is `permission-denied`, and the step is `agent grant <name> --schema-changes`, as yourself.',
    `Without \`--as\`, in a project whose \`.env\` names an agent (\`${AGENT_BINDING_KEY}\`), \`whoami\` and \`status\` name it and give the \`--as <name>\` step. An entry that is not a valid agent name is never shown.`
  ])}

\`${CLI_NAME} setup agent [name]\` sets a project up for the agent hosts it finds (${and(hosts.map((host) => host.label))}) in one plan: it adds the agent or keeps it, writes its name to \`.env\` as \`${AGENT_BINDING_KEY}\`, and gives each host the MCP entry \`${CLI_NAME} mcp --as <name> --read-only\`. It creates a host's file only where there is none, and never edits one. It installs no skill; its next step is \`${SKILLS.command}\`.

\`${CLI_NAME} mcp\` serves the tools behind the database commands to an agent host, over MCP on stdin and stdout. With \`--as <name>\` it serves the tools that write only when the agent may change the schema and \`--read-only\` is not given. Without \`--as\` it acts as you and serves only the tools that read, unless \`--write\`. Each tool that writes asks the host to get your approval of every call, and tools that can lose data are never served.

${and(asking)} asks you before every call of a tool that writes, so for an agent that may change the schema, its entry leaves out \`--read-only\`. The entries of ${and(others)} keep it, because the CLI cannot tell that those hosts ask; ${WRITES_BY_HAND}.`;
}

const RULES = `A rule says who may read or change the rows of a table. Every command and MCP tool that takes rules (\`table add\`, \`access set\`, \`access add\` and \`blueprint apply\`) takes this JSON shape, and \`access explain\` and \`schema show\` print stored rules in it, so a rule you read can be written back:

${block([RULE_SHAPE])}

${list([
    '`$type`: the rule type. `access types` lists them; `access types <type>` shows one, with when to use it, its risks, its parameters and the columns it needs.',
    '`privileges`: the operations it covers: `select`, `insert`, `update` and `delete`.',
    '`permissive: false`: a limit every row must also pass. Without it, a row passes when any one rule lets it.',
    '`policy_role`: the database role it applies to; the default is `authenticated`.',
    '`policy_name`: a name of its own. A second rule of the same type, role and privilege needs one; or combine such rules in one `AuthzComposite`.',
    '`data`: the parameters of its type. A rule whose data does not fit is refused before any change.'
  ])}

With row security on and no rule, no one gets in, so \`table add\` with no \`--rule\` stops with exit 2 and gives this example, where only the person in \`owner_id\` reads and changes a row:

${block([`${CLI_NAME} table add tasks --field title:text:required --node ${OWNER_NODE} --rule '${JSON.stringify(OWNER_ONLY_RULE)}'`])}

The commands say in plain words what each rule checks, and never whether a given person can reach a row. \`access explain <table>\` gives one sentence per rule, the grants, row security, and the findings (\`high\`, \`medium\` or \`low\`), each with its fix.`;

const FILES = `${table([
  ['PATH', 'WHAT IT HOLDS'],
  [`~/.${STASH_NAME}/`, 'the store, shared with the agent CLI and the desktop app; only you can read it'],
  [`~/.${STASH_NAME}/config/`, 'the contexts, the session of each (your 30-day API key) and the key of each agent'],
  [`~/.${STASH_NAME}/cache/`, 'the access token of each agent, and the update check; safe to delete'],
  ['.env', 'the project binding, and the agent name that setup agent writes'],
  ...hosts.map((host) => [host.mcpFile, `the MCP entry of ${host.label}`])
])}

\`${STASH_DIR_ENV}\` moves the store to \`<dir>/.${STASH_NAME}/\`. \`db create\` and \`db use\` write ${and(ARCHIVED_BINDING_KEYS.map(code))} to \`.env\`, and nothing else; \`db create\` also keeps a request there until its database is ready. \`setup agent\` writes \`${AGENT_BINDING_KEY}\`, and creates a host's file only where there is none. No secret is written to the project. A value that fails its check, such as a \`DATABASE_ID\` that is not a database id, is never sent or shown.`;

/** The help topics of the CLI, from the commands of its registry: `constructive help <name>`, and sections of the reference. */
export function helpTopics(commands: CommandDefinition[]): HelpTopic[] {
  return [
    { name: 'environment', summary: 'The environment variables the CLI reads', body: ENVIRONMENT, section: 'ENVIRONMENT' },
    { name: 'exit-codes', summary: 'The exit codes and the error codes', body: EXIT_CODES, section: 'EXIT STATUS' },
    { name: 'output', summary: 'What a command prints: text on a terminal, else JSON', body: output(commands) },
    { name: 'approval', summary: 'How a change is planned and approved', body: approval(commands) },
    { name: 'agents', summary: 'Agents: their own key, --as, setup agent and MCP', body: agents() },
    { name: 'rules', summary: 'The shape of an access rule', body: RULES },
    { name: 'files', summary: 'The files the CLI reads and writes', body: FILES, section: 'FILES' }
  ];
}
