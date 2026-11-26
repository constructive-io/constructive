import { COMMAND_ERROR_CODES, type CommandDefinition, ExitCode, type HelpTopic } from '@agentic-kit/command';
import { ARCHIVED_BINDING_KEYS } from '@agentic-kit/db-tools';
import { TOOL_FAILURE_CODES, TOOL_FAILURE_MEANINGS } from '@agentic-kit/harness';
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

const ENVIRONMENT = `These variables take the place of the store, for CI and for isolated runs:

${list([
    '`CONSTRUCTIVE_API_ENDPOINT` names the backend, in place of the stored context. When its host starts with `api.`, the other endpoints come from it: `api.example.com` gives `auth.example.com`, `modules.example.com`, and so on.',
    '`CONSTRUCTIVE_AUTH_ENDPOINT`, `CONSTRUCTIVE_MODULES_ENDPOINT`, `CONSTRUCTIVE_AGENT_ENDPOINT` and `CONSTRUCTIVE_COMPUTE_ENDPOINT` each set one endpoint, and need `CONSTRUCTIVE_API_ENDPOINT`. A backend whose api host does not start with `api.` needs all four.',
    '`CONSTRUCTIVE_USER_ID` and `CONSTRUCTIVE_ACCESS_TOKEN`, with an optional `CONSTRUCTIVE_API_KEY`, are an account for CI, in place of a stored session. They need `CONSTRUCTIVE_API_ENDPOINT`, so the credential goes only to the backend named next to it.',
    `${code(STASH_DIR_ENV)} keeps the store in \`<dir>/.${STASH_NAME}/\` in place of the home directory, for tests and isolated runs. It also turns off the update check, which would otherwise ask the npm registry and keep its answer under the home directory.`
  ])}

A stored session goes only to the backend it was signed in to: all the endpoints of its context must still be the ones it was signed in with, and it never goes to a backend that \`CONSTRUCTIVE_API_ENDPOINT\` names, unless that variable names exactly the backend of the context.

A variable that is set wrong, or set without the one it needs, stops every command with \`invalid-override\` (exit 2), and the message names it and says what to set. \`--context\` with a variable that chooses another backend is \`context-conflict\`, and \`--as\` with any \`CONSTRUCTIVE_*\` credential or endpoint variable is \`agent-conflict\` (both exit 2), because the run cannot tell whose credential to use.

These change how a command runs:

${list([
    '`CI`, when it is set and not empty, turns prompts off, as `--no-input` does, and the update check does not run.',
    '`DEBUG`, when it is set and not empty, adds the stack trace of an unexpected error to its output.',
    '`server` reads the standard Postgres variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) for the database it serves.'
  ])}`;

const EXIT_CODES = `Every command exits with one of these codes:

${list([
    `${code(String(ExitCode.ok))}: done.`,
    `${code(String(ExitCode.failure))}: failed. \`error.code\` says why, and \`meta.next\` holds the commands that help.`,
    `${code(String(ExitCode.usage))}: bad or missing input (a command, a flag or a value), so nothing ran.`,
    `${code(String(ExitCode.approvalRequired))}: the change needs approval, so nothing changed. The plan is in \`error.details.plan\`; rerun the command with \`--yes\` once the person approves it.`,
    `${code(String(ExitCode.signInRequired))}: sign in first. The credential is missing, expired or rejected, and \`meta.next\` holds the step.`,
    `${code(String(ExitCode.interrupted))}: interrupted (Ctrl-C). Nothing more is sent, but a change that had started may be partly made, so check the state before you run the command again.`
  ])}

A failure also has a code: \`error.code\` in the JSON envelope, and \`Error (<code>)\` at the start of the text. A code means the same in every command.

The codes of the command line itself, for its input, its approval and an interrupt:

${list(Object.entries(COMMAND_ERROR_CODES).map(([name, meaning]) => `${code(name)}: ${meaning}`))}

The codes of the sign-in, the contexts, the agents and the project binding:

${list(Object.entries(CLI_ERROR_CODES).map(([name, { exit, meaning }]) => `${code(name)} (exit ${exit}): ${meaning}`))}

The codes of the database tools, which the database commands and the MCP tools both answer with:

${list(TOOL_FAILURE_CODES.map((name) => `${code(name)}: ${TOOL_FAILURE_MEANINGS[name]}`))}`;

function output(commands: CommandDefinition[]): string {
  const own = commands.filter((command) => 'passthrough' in command);
  const serve = commands.filter((command) => 'serve' in command);
  return `On a terminal, a command prints text on stdout, then a \`Next:\` block with the commands to run next; warnings and errors go to stderr. When stdout is not a terminal, or with \`--json\` (the same as \`--format json\`), it prints one JSON envelope on stdout instead:

${list([
    'On success: `{"ok": true, "data": ..., "meta": {"command": ..., "next": [...], "warnings": [...]}}`.',
    `On failure: \`{"ok": false, "error": {"code": ..., "message": ..., "cause": ..., "hint": ..., "retryable": ..., "details": ...}, "meta": {"command": ..., "next": [...]}}\`. \`${CLI_NAME} help exit-codes\` says what each code means.`
  ])}

\`--format text\` prints text when stdout is not a terminal. \`--fields id,owner.name\` keeps only these dot paths of \`data\`, in each item of a list too. On a read, a path that matches nothing fails with \`invalid-input\`; after a change it is only a warning, since the change was made.

Each step in \`meta.next\` has \`command\` (the line quoted for POSIX shells), \`argv\` (the exact words to run, the CLI name first), \`placeholders\` (the words of \`argv\` to replace first, such as \`<name>\`) and \`why\`. A step repeats \`--context\`, \`--as\` and \`--cwd\` when the run had them, so it acts on the same backend, as the same agent, in the same directory.

${names(own)} take their own flags and print their own output. ${names(serve)} keeps stdout for its protocol, so its errors go to stderr.

\`--help\`, \`--version\`, \`--schema\` and \`--llms\` print to stdout. \`<command> --schema\` prints the input and output JSON Schema of a command, \`--llms\` a Markdown index of the commands, and \`--llms --json\` the full manifest, with every command and every help topic.

A command never prompts without a terminal, with \`--no-input\` or \`--tty false\`, or when \`CI\` is set: a missing value then fails with \`missing-input\` (exit 2), and \`error.details.missing\` names the flags. \`--input '<json>'\`, \`--input @file.json\` or \`--input -\` (stdin) gives the whole input as JSON, and flags override its keys.`;
}

function approval(commands: CommandDefinition[]): string {
  const atOnce = commands.filter((command) => 'immediate' in command);
  const ownWrites = commands.filter((command) => 'passthrough' in command && command.effect !== 'read');
  const serve = commands.filter((command) => 'serve' in command);
  return `Each command has one effect: \`read\` changes nothing, \`write\` changes something, and \`destructive\` can lose data; \`${CLI_NAME} --help\` shows the effect of each. Every write or destructive command has a plan, but the few below, and the command line runs its approval, so no command can skip it:

1. The command makes its plan: what it changes, where, and as whom. \`--dry-run\` prints the plan and changes nothing, and its \`meta.next\` is the command that applies it.
2. On a terminal, the command shows the plan and asks. A yes applies exactly that plan; a no changes nothing (\`cancelled\`, exit 1).
3. Without a terminal, the command stops before the change with exit 3 (\`approval-required\`), and the plan is in \`error.details.plan\`. Show the plan to the person, and once they approve it, run the step in \`meta.next\`, which adds \`--yes\`.
4. \`--yes\`, or \`-y\`, approves the plan without a prompt.

When applying a plan needs a secret that a terminal would ask for, such as the person's password for a new agent key, the steps of a run with no terminal add \`--password-stdin\`, so that the secret is piped in and never given as a flag value.

These change at once, with no plan, and refuse \`--dry-run\`: ${names(atOnce)}. They change only the person's own sign-in or stored contexts, or narrow what an agent may do. ${names(ownWrites)} takes its own flags, so it has no plan either. ${names(serve)} serves the tools to an agent host, which asks the person before each change made through it (\`${CLI_NAME} help agents\`).`;
}

function agents(): string {
  const asking = hosts.filter((host) => host.asksBeforeWrites).map((host) => host.label);
  const others = hosts.filter((host) => !host.asksBeforeWrites).map((host) => host.label);
  return `An agent is an identity of its own for a program that works for you: a principal of yours on the backend, with its own key, stored beside your session in the store, which only you can read. No command prints a key or a token.

${list([
    `\`${CLI_NAME} agent add <name>\` creates one, after you approve its plan. A key for a principal needs a fresh sign-in, so it asks for your password on a terminal, or reads it from stdin with \`--password-stdin\`, and ends that sign-in once the key is made. By default the agent may read the schema and the access of every database of your organizations, and may not change the schema; \`--organization <id>\` holds it to one organization, and \`--allow-schema-changes\` lets it change the schema.`,
    'The key lasts 30 days. The CLI uses it only to get a short-lived access token, keeps that token, and uses it again until it ends. Whoever holds the key can act as the agent until the key ends, you renew it, or you remove the agent.',
    '`agent renew <name>` gives the agent a new 30-day key for the same principal, so it keeps its grants, and revokes the old key; it needs your password too. `agent list` shows when each key ends.',
    '`agent grant <name> --schema-changes` lets the agent add, change and delete tables, fields and relations (a delete also deletes the data in it), and replace the rules of who may read and write each table. It widens what the agent may do, so it is a change with a plan. `agent revoke <name> --schema-changes` stops that at once.',
    '`agent remove <name>` deletes the agent\'s principal, which ends its key and every token of it at once. `logout` does not: each agent keeps its own key until it ends or you remove the agent.'
  ])}

A command acts as you unless it says \`--as <name>\`. Then it acts as that agent, with its own key, and every next step keeps \`--as\`; \`whoami\` and \`status\` say which agent acts, what it may do and when its key ends. \`login\`, \`logout\`, the \`context\` commands and the \`agent\` commands always act as you, and refuse \`--as\`. ${SHELL_LIMIT}

${list([
    'When the backend refuses the agent\'s access token before it ends, a read, or the plan of a change, gets one new token and runs once more, since neither changes anything. A change that is being applied does not run again by itself, since part of it may already be made: it fails with `signed-out` (exit 1, retryable), and its step is the same command.',
    'A key that ended, or a second refusal, is `agent-unusable` (exit 4), and the step is `agent renew <name>`, which you run as yourself. A token that could not be minted for a moment is `agent-unusable` with exit 1 and retryable, since the key is unchanged.',
    `Without \`--as\`, in a project whose \`.env\` names an agent (\`${AGENT_BINDING_KEY}\`), \`whoami\` and \`status\` name that agent, say that the run acts as you, and give the \`--as <name>\` form as a step. An entry there that is not a valid agent name is never shown: they say it is not valid, and give \`setup agent <name>\` as the step.`
  ])}

\`${CLI_NAME} setup agent [name]\` sets a project up for the agent hosts it finds (${and(hosts.map((host) => host.label))}), in one plan: it adds the agent or keeps the one that exists, writes its name to the project's \`.env\` as \`${AGENT_BINDING_KEY}\`, and gives each host its MCP entry, \`${CLI_NAME} mcp --as <name> --read-only\`. It creates a host's MCP file only where there is none, and never edits one; otherwise its result gives the entry to add by hand. It installs no skill: its next step is \`${SKILLS.command}\`.

\`${CLI_NAME} mcp\` serves the tools behind the database commands to an agent host, over MCP on stdin and stdout. With \`--as <name>\` it acts as that agent, and serves the tools that write only when the agent may change the schema and \`--read-only\` is not given. Without \`--as\` it acts as you and serves only the tools that read, unless \`--write\` adds the tools that write. Each tool that writes asks the host to get your approval of every call, and tools that can lose data are never served.

${and(asking)} asks you before every call of a tool that writes, so once the agent may change the schema, the entry \`setup agent\` gives ${and(asking)} leaves out \`--read-only\`. The entries of ${and(others)} keep it, because the CLI cannot tell that those hosts ask before each write; ${WRITES_BY_HAND}.`;
}

const RULES = `A rule says who may read or change the rows of a table. Every command and MCP tool that takes rules (\`table add\`, \`access set\`, \`access add\` and \`blueprint apply\`) takes this one JSON shape, and \`access explain\` and \`schema show\` print each stored rule in it, so a rule you read can be written back:

\`\`\`
${RULE_SHAPE}
\`\`\`

${list([
    '`$type` is the rule type. `access types` lists the rule types, with who each one lets in and whether it can go onto an existing table; `access types <type>` shows one with when to use it and when not, its risks, its parameters (type, default, required) and the columns it needs.',
    '`privileges` are the operations it covers, from `select`, `insert`, `update` and `delete`.',
    '`permissive: false` makes it a limit that every row must also pass. Without it, a row passes when any one rule lets it.',
    '`policy_role` is the database role it applies to; the default is `authenticated`.',
    '`policy_name` gives it a name of its own. A second rule of the same type, role and privilege is refused without one; or combine such rules in one `AuthzComposite`.',
    '`data` holds the parameters of its type. A rule whose data does not fit its type is refused before any change, and the step names `access types <type>`.'
  ])}

A table with row security and no rule lets no one in, so \`table add\` with no \`--rule\` stops with exit 2 and gives a ready example: only the person whose id is in its \`owner_id\` column reads and changes a row.

\`\`\`
${CLI_NAME} table add tasks --field title:text:required --node ${OWNER_NODE} --rule '${JSON.stringify(OWNER_ONLY_RULE)}'
\`\`\`

The commands say in plain words what each rule checks; none of them says yes or no about who can reach a row. \`access explain <table>\` gives one sentence for each stored rule, the grants, whether row security is on, and the findings: what may be wrong, at a level of \`high\`, \`medium\` or \`low\`, with the fix.`;

const FILES = list([
  `\`~/.${STASH_NAME}/\` is the store, which the agent CLI and the desktop app share; \`${STASH_DIR_ENV}\` moves it to \`<dir>/.${STASH_NAME}/\`. Only you can read it.`,
  `\`~/.${STASH_NAME}/config/\` holds the backend contexts and which one is active, the session of each context (your API key, which lasts 30 days: \`login\` makes it, and \`logout\` revokes it) and the key of each agent.`,
  `\`~/.${STASH_NAME}/cache/\` holds each agent's short-lived access token and the last answer of the update check. A file in it may be deleted at any time.`,
  `\`.env\` in the project directory is the binding. \`db create\` and \`db use\` write ${and(ARCHIVED_BINDING_KEYS.map(code))}, and nothing else; while a new database is not ready yet, \`db create\` also keeps its request there, and removes it once the database is ready. \`setup agent\` writes \`${AGENT_BINDING_KEY}\`. No secret is written to the project. A value that fails its check, such as a \`DATABASE_ID\` that is not a database id, is never sent or shown, and \`status\` reports it as not valid.`,
  `${and(hosts.map((host) => `\`${host.mcpFile}\` (${host.label})`))} hold the MCP entry of each agent host. \`setup agent\` creates one only where there is none, and never edits one.`
]);

/** The help topics of the CLI, from the commands of its registry: `constructive help <name>`, and sections of the reference. */
export function helpTopics(commands: CommandDefinition[]): HelpTopic[] {
  return [
    { name: 'environment', summary: 'The environment variables the CLI reads', body: ENVIRONMENT, section: 'ENVIRONMENT' },
    { name: 'exit-codes', summary: 'The exit codes, and what the code of each failure means', body: EXIT_CODES, section: 'EXIT STATUS' },
    { name: 'output', summary: 'What a command prints: text on a terminal, one JSON envelope otherwise', body: output(commands) },
    { name: 'approval', summary: 'How a change is planned and approved, and the commands that change at once', body: approval(commands) },
    { name: 'agents', summary: 'Agents: their own key, --as, setup agent and the MCP server', body: agents() },
    { name: 'rules', summary: 'The one shape of an access rule, and where to find the rule types', body: RULES },
    { name: 'files', summary: 'The files the CLI reads and writes', body: FILES, section: 'FILES' }
  ];
}
