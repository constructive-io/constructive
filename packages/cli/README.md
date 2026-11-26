# Constructive CLI

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/cli"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fcli%2Fpackage.json"/></a>
</p>

`constructive` (also `cnc`) uses the Constructive platform with no UI: sign in, create a database, and change its schema, from a terminal or from an agent. The same commands work for both, because every command reads a JSON Schema input, prints one JSON envelope when stdout is not a terminal, and never prompts without one.

```bash
npm install -g @constructive-io/cli
```

## The golden path

On a terminal, a person signs in, creates a database for the current directory and adds a table with its rules. Each database change shows its plan and asks before it runs.

```bash
constructive login --api-endpoint https://api.example.com/graphql --email you@example.com
constructive db create my-app
constructive table add tasks --field title:text:required --field done:boolean \
  --node DataDirectOwner --rule '{"$type":"AuthzDirectOwner","privileges":["select","insert","update","delete"],"data":{"entity_field":"owner_id"}}'
constructive access explain tasks
constructive schema show
```

A script or an agent runs the same path without a terminal. The password comes from stdin, and a database change needs `--yes` (or `-y`): without it the command stops with exit 3 and puts the plan in `error.details.plan`, so the agent can show it to the person first.

```bash
printf %s "$PASSWORD" | constructive login --api-endpoint https://api.example.com/graphql --email you@example.com --password-stdin
constructive db create my-app            # exit 3, the plan, and meta.next: "constructive db create my-app --yes"
constructive db create my-app --yes      # provisioning can take a few minutes
constructive table add tasks --field title:text:required --node DataDirectOwner --rule "$OWNER_ONLY_RULE" --yes
constructive status                      # what is signed in, where, the server's version, and which database this directory uses
```

`--dry-run` shows the plan of a change and changes nothing. `constructive status` never fails for a missing piece; its `next` names the command for it. It also shows the version and commit the backend's server runs (`GET /version`), or "version unknown" with the reason, for example a server older than that route. Each next step has `argv`, the words to run as they are, and `placeholders` (such as `<name>`) to fill in first.

## Commands

Each command has one effect: `read` changes nothing, `write` changes something, and `destructive` can lose data. A change to a database (every `db`, `table`, `field`, `relation`, `blueprint`, `access`, `entity-type` and `template` change, `db use` and `api mutate`) shows its plan and needs `--yes`, or a yes on a terminal, and `--dry-run` shows the plan alone; so do `agent add`, `agent renew`, `agent grant`, `agent remove` and `setup agent`. `login`, `logout`, `agent revoke` and the `context` commands change at once: they change only the person's own sign-in or stored contexts, or narrow what an agent may do, so they have no plan and refuse `--dry-run`. `codegen` takes its own flags, and `mcp` starts at once too; the host asks the person before each change made through it. The command layer runs the approval of every other change, so none can skip it. `context remove` signs out of the context's stored session first, as `logout` does.

| Group | Read | Write | Destructive |
| --- | --- | --- | --- |
| Account | `whoami`, `status` | `login`, `logout` | |
| Agents | `agent list` | `agent add <name>`, `agent renew <name>`, `agent grant <name> --schema-changes`, `agent revoke <name> --schema-changes` | `agent remove <name>` |
| Backends | `context list` | `context add <api-endpoint>`, `context use <name>`, `context remove <name>` | |
| Database | `db list`, `db status` | `db create <name>`, `db use <name-or-id>`, `db codegen` | `db recreate <name>` |
| Schema | `schema show` | `table add <name> --rule <rule>`, `field add <table> <name>`, `field update <table> <name>`, `relation add <source> <target>`, `blueprint apply` | `table delete <name>`, `field retype <table> <name> --type <type>`, `field delete <table> <name>` |
| Access | `access types [type]`, `access explain [table]` | `access set <table> --rule <rule>`, `access add <table> --rule <rule>` | |
| Entity types | `entity-type list` | `entity-type create <name>` | `entity-type delete <id>` |
| Templates | `template list` | `template create <name>`, `template apply <name>`, `template update <name>` | `template delete <name>` |
| GraphQL | `api query <document>`, `api search <term>`, `api describe <name>` | `api mutate <document>` | |
| Agent host | | `mcp`, `setup agent [name]` | |
| Self-host | `server`, `explorer` | `codegen` | |

`constructive --help` lists them, `constructive <command> --help` (or `constructive help <command>`) shows the flags of one, `constructive <command> --schema` prints its input as JSON Schema, and `constructive --llms` (or `--llms --json` for the full manifest) is the index for agents.

## Help topics and the man page

The facts that belong to no one command are help topics, which the CLI prints and its manifest carries:

| Topic | What it covers |
| --- | --- |
| `constructive help output` | the text and the JSON envelope, `--fields`, `meta.next`, and prompts |
| `constructive help approval` | plans, `--dry-run`, `--yes`, exit 3, and the commands that change at once |
| `constructive help exit-codes` | the exit codes, and what the code of each failure means |
| `constructive help agents` | an agent's own key, `--as`, `setup agent` and the MCP server |
| `constructive help rules` | the one shape of an access rule, and `access types` |
| `constructive help environment` | the `CONSTRUCTIVE_*` variables, `CI` and `DEBUG` |
| `constructive help files` | the store, the project binding in `.env`, and the MCP files of each host |

`man constructive` (or `man cnc`) is the whole reference in one page: every command with its flags, examples and notes, then every topic. The page is made from the same registry and topics at build time, and `npm install -g @constructive-io/cli` installs it.

The database commands act on the database bound to the working directory: `db create` and `db use` write `DATABASE_ID` and its endpoints to the directory's `.env`, and nothing else; no app is cloned or installed. A `DATABASE_ID` that is not a database id is neither sent to the backend nor shown: `status` and `db status` report the database as `invalid`. `db codegen` generates the typed SDK of the app in `packages/app` when you ask for it. Use `blueprint apply` for several related tables.

## Access

The access of a table is its row security rules and its grants. A rule has one shape everywhere (`table add`, `access set`, `access add`, `blueprint apply` and the MCP tools), which `constructive help rules` describes, with the rule types `access types` lists. The commands say what each rule checks in plain words from the node type registry; no command says yes or no about who can reach a row.

- **New tables.** `table add <name>` takes `--field name:type[:required]`, `--node` (a Data node as its type, `DataDirectOwner`, or as JSON with its `data`) and `--rule` (a rule as JSON), each repeatable. With no `--rule` it stops with exit 2 (`missing-input`), because a table with row security and no rule lets no one in, and its hint and `meta.next` give a ready owner-only example: `--node DataDirectOwner --rule '{"$type":"AuthzDirectOwner","privileges":["select","insert","update","delete"],"data":{"entity_field":"owner_id"}}'`. Every table also gets `id`, `created_at` and `updated_at`, and the columns its rules need; a `--field` that names one of those is refused.
- **Explain.** `access explain [table]` gives, for one table or every table, one plain sentence per stored rule, the grants, whether row security is on, and the findings. In the JSON, and in `schema show`, each stored rule has the one rule shape, without the keys the backend sets (the member lists it resolves, the parse trees it stores, the table it records), so a rule you read can be written back; a rule whose stored data was only a parse tree comes back with empty `data`, and its sentence says what it checks.
- **Set and add.** `access set <table> --rule <rule> ...` replaces every rule of the table in one change; the grants stay. Its plan shows the rules now and after, one sentence each, the findings it adds and removes, and the columns it adds. Its next steps are `access explain <table>`, and for a required column that no rule fills any more, `field update <table> <column> --no-is-required` and `field delete <table> <column>`. `access add <table> --rule <rule> ...` adds rules and keeps the ones the table has. A second rule of the same type, role and privilege is refused unless it has a `policy_name` of its own; or combine such rules in one `AuthzComposite`.
- **Findings.** Each has a level (`high`, `medium`, `low`), a summary, the risk and the fix: an owner check without membership, app membership on rows of a team, a grant no rule lets anyone use, rules with row security off, a change that checks no one, a membership limit that blocks another rule, a write rule for people who cannot read the row, a raw part no rule type describes, and columns that are not as a rule's Data node makes them. A finding fires when the structure may be wrong, and its words say so. When a command carries out the fix, it is a next step.

## Sign-in, contexts and the environment

A backend is a named context in the shared Constructive stash, which the `agent` CLI and the desktop app read too. `context add <api-endpoint>` stores one, and keeps the session stored under its name; a context that holds a session other endpoints issued is left as it is (`context-in-use`, exit 1), with the steps `logout --context <name>`, which revokes its key, and the same `context add` again. `context remove <name>` signs out of the context first; while agents of the person are filed under it, it removes nothing (`context-in-use`, exit 1), with the steps `agent remove <agent> --context <name>` for each, which ends its key, and the same `context remove` again. When the api host starts with `api.`, the other planes are derived from it (`api.example.com` gives `auth.example.com`, `modules.example.com`, …); any other host must give every plane with `--auth-endpoint`, `--modules-endpoint`, `--agent-endpoint` and `--compute-endpoint`. `login` signs in with email and password, makes an API key that lasts 30 days, stores it under the context, ends the password sign-in, and makes the context the active one. Sign in again before the key ends: `whoami` and `status` warn when it ends within a week. The password comes from a prompt, or from stdin with `--password-stdin`; it is never a flag value. `--context <name>` runs one command against another stored context. A context name has lower-case letters, digits, `.`, `-` and `_`. `context list` shows a context that another program stored under another name with `invalidName`, and names the directory to remove its file from, since no command acts on it.

When a context's endpoints change, `status` names each plane that differs, and a new `login` replaces the session. The environment variables that take the place of the store, for CI and isolated runs, are in `constructive help environment`, and the files of the store are in `constructive help files`.

## The `api` commands

`api query` sends a GraphQL operation that only reads, at once. `api mutate` sends a mutation; without `--yes` it stops with the plan: the endpoint, the account, each root field with its arguments as written (fragments resolved), and the variables (their values only when given as text). With several operations in a document, `--operation-name` picks the one that runs, and the effect and the plan follow that one. `--query` and `--variables` take text, `@file`, or `-` for stdin; give a secret in a variable through `-` or `@file`. A file of a session store (the current one, or the default one under the home directory) is never read as input, through a symbolic link or a hard link either. `api search <term>` and `api describe <name>` read the schema of a plane by introspection, short by default (`--limit` shows more). `api describe` shows a type's fields, an input type's fields with their defaults, or a field's arguments, and from a field it points to the input types its arguments take.

A request goes only to a plane of the session's backend, `--plane api|auth|modules|agent|compute` (default `api`), with the session credential, or with none when no one is signed in. Reaching a database's own API with its own credential is not supported.

## Agents

An agent is an identity of its own for a program that works for the signed-in person: a principal of the person on the backend, with its own key, which lasts 30 days. `constructive help agents` says what the key means, how `agent add`, `agent renew`, `agent grant`, `agent revoke` and `agent remove` change it, how `--as` acts as the agent, and which hosts get the tools that write.

### `setup agent`

`constructive setup agent [name]` sets a project up for the agent hosts it finds (Claude Code: `.claude`, `.mcp.json` or `CLAUDE.md`; Codex: `.codex` or `AGENTS.md`; Cursor: `.cursor`; or `--host`), in one plan:

1. **The agent.** It adds the agent (named after the folder by default, or the one the project's `.env` names, read-only for the schema unless `--allow-schema-changes`), or keeps the one that exists. An agent whose key ended gets a new key, as `agent renew` gives it. On an agent that exists, `--allow-schema-changes` grants it schema changes, as `agent grant` does; without the flag, an agent that has them keeps them. A new key needs the person's password, from a prompt or `--password-stdin`. When `.env` holds a `CONSTRUCTIVE_AGENT` that is not a valid agent name and no name is given, it stops with `invalid-binding` (exit 2) without showing the entry, and the step is `setup agent <name>`, which replaces it.
2. **The binding.** It writes `CONSTRUCTIVE_AGENT=<name>` to the project's `.env`, beside `DATABASE_ID`. `status`, `whoami` and a rerun read it there. Commands still act as the person unless they say `--as <name>`.
3. **The host entry.** Each host gets the MCP server `{ "command": "constructive", "args": ["mcp", "--as", "<name>", "--read-only"] }` in `.mcp.json`, `.codex/config.toml` or `.cursor/mcp.json`. Claude Code's entry drops `--read-only` once the agent may change the schema, because Claude Code asks the person before every call of a tool that writes. The entries of Codex and Cursor keep `--read-only`, because the CLI cannot tell that they ask before each write; to let an agent write through such a host, take `--read-only` out of its entry's args by hand, once you have checked that the host asks you before every call of a tool that writes. It creates such a file only when it does not exist, and never edits one that does: for Claude Code it runs `claude mcp add --scope project constructive -- constructive mcp --as <name> --read-only` when `claude` is on the PATH, then reads `.mcp.json` again, and when the entry is not there (or `claude` failed), or `claude` is not on the PATH, the result gives the entry to add by hand. A file that already holds the entry is kept. When the `constructive` server there differs from the entry only in `--read-only` (after `agent grant` or `agent revoke`), the file is not edited either, and the result says to take `--read-only` out of its args, or add it, by hand. The plan never quotes what another `constructive` server in a host's file runs.
4. **The skill.** It installs no skill. Its next step is `npx skills add constructive-io/constructive-skills --skill constructive-headless`, which adds the Constructive skill to the host.

No secret is written to the project. A link on the way that leaves the project stops the run with `unsafe-path`, before the agent is added. After the person answers the question, it reads the host files again, and stops with `conflict` when one changed since the plan. `--dry-run` shows what it would add and write.

## Use with an agent host (MCP)

`constructive mcp` serves the tools behind the database commands to an agent host over the Model Context Protocol, on stdin and stdout, until the host closes stdin. `setup agent` writes the entry an agent host starts it with:

```json
{ "command": "constructive", "args": ["mcp", "--as", "<name>", "--read-only"] }
```

- **What it offers.** The same tools the database and access commands use, under their tool names (`describe_schema`, `create_field`, `set_access`, …), with the same parameters, plans and failures. A result carries the tool's text and an envelope (`{ ok, data, error?, calls? }`), and `calls` are the tool calls to make next. Tools that can lose data (`destructive`) are never served, and neither is a tool whose result carries a secret, such as a new API key; the person runs those as commands. Records have no tool here yet.
- **Who it acts as.** With `--as <name>` it acts as that agent: it serves the tools that write only when the agent may change the schema and `--read-only` is not given. Without `--as` it acts as the person and serves only the tools that read, unless `--write` adds the tools that write on the person's own session.
- **Approval.** Each tool that writes is marked `readOnlyHint: false` and `_meta["anthropic/requiresUserInteraction"]: true`, so a host that supports it asks the person before every call: Claude Code asks in every permission mode and denies the call where no one can answer. For any other host, use `--read-only`, which `setup agent` keeps in the entries of Codex and Cursor. A call the host lets through runs once, through the plan of its command, and its result says what changed.
- **Session and directory.** It acts on the session of `--context` (or the active one) and on the database bound to the working directory (`--cwd`). A wrong `--context` or a conflicting environment stops it at start with the usual error. A sign-in problem does not: it says so on stderr, each tool call answers with that failure, and once the person runs `constructive login` the server uses the new session without a restart.
- **Output.** Standard output carries only the protocol, also when the server fails to start: a wrong flag or context is an error on stderr with exit 2, and stdout stays empty. Anything else goes to stderr too, and the server never prompts. `--help` still prints to stdout. `--dry-run` is refused, because it has no plan, and so is `--yes`, which approves nothing here.

## The agent skill

The CLI ships no skill of its own: `constructive --llms`, `<command> --help` and `<command> --schema` describe this version. `npx skills add constructive-io/constructive-skills --skill constructive-headless` adds the Constructive skill, which points an agent to them, to `--as` and to the project binding.

## Output, exit codes and failures

`constructive help output` describes the text and the JSON envelope, and `constructive help exit-codes` the exit codes and what each failure code means.

A failed database command has the code of the tool behind it. `meta.next` starts with the calls the tool itself suggests, each as the command that makes it: `db create <database_name>` when the directory has no database, `access types <type>` for a rule whose data does not fit its type, the read that shows what exists after `not-found`, `name-taken` or `no-rows-changed`, `access explain <table>` after an access change that was applied but could not be checked (`unverified`), and the two `field` commands after an `access set` that leaves a required column no rule fills. Then come the steps only the CLI knows, by code:

| Codes | Next |
| --- | --- |
| `signed-out` | `login` (with the context's endpoint) |
| `step-up-required` | `login` again: the change needs a fresh sign-in |
| `no-backend` | `login --api-endpoint <url> --email <email>` |
| `no-env`, `missing-credentials` | `db use <name-or-id>`, `db list` |
| `db-missing` | `db recreate <database_name>`, `db list` |
| `account-mismatch` | `whoami`, `db recreate <database_name>` |
| `partial` | `schema show` |
| `permission-denied`, `read-only` | `whoami` |
| `backend-unreachable` | `status` |
| `limit-reached` | `db list` |
| `invalid-input` | the same command with `--schema` |
| `db-suspended`, `database-unavailable`, `schema-unresolved`, `binding-live`, `binding-changed`, `binding-not-saved`, `reprovision-not-allowed`, `provision-stuck` | `db status` |
| `env-write-failed` | `db use <name-or-id>` |
| `app-missing` | `codegen --endpoint <app-endpoint> --orm --output <project>/codegen`: the project has no app, so `db codegen` cannot write its SDK, and this generates an ORM client from the database's API instead |
| `query-too-large` | `api describe <field>` from `api query`; none from other commands |
| `not-found`, `name-taken`, `no-rows-changed`, `pending-other`, `provision-pending`, `ticket-lost`, `plan-required`, `app-signed-out`, `conflict`, `unsupported`, `unverified`, `rate-limited`, `failed` | none of its own: the tool's calls, the message and the hint say what to do |

A step repeats `--context` and `--cwd` when the run had them, so it acts on the same backend and directory.

## Self-host: server, explorer and codegen

`server` starts a Constructive GraphQL server on a local Postgres (the standard `PG*` variables pick it), `explorer` starts GraphiQL, and `codegen` generates React Query hooks or an ORM client from a schema, an endpoint or a database. They keep their own flags; run `constructive server --help`, `constructive explorer --help` or `constructive codegen --help`. For migrations and packages, use [pgpm](https://pgpm.io).

## What changed in 9.0.0

9.0.0 replaces the 8.x `cnc` commands with the commands above. Both binaries, `constructive` and `cnc`, run the same CLI.

| 8.x | 9.0.0 |
| --- | --- |
| `cnc context create <name> --endpoint <url>` | `constructive context add <api-endpoint> --name <name>`, or `constructive login --api-endpoint <url>` |
| `cnc context current` | `constructive context list` or `constructive status` |
| `cnc context delete <name>` | `constructive context remove <name>` |
| `cnc auth set-token <token>` | `constructive login` (email and password; the key is made for you), or `CONSTRUCTIVE_USER_ID`, `CONSTRUCTIVE_ACCESS_TOKEN` and `CONSTRUCTIVE_API_ENDPOINT` for CI |
| `cnc auth status` | `constructive whoami` or `constructive status` |
| `cnc auth logout` | `constructive logout` |
| `cnc execute --query <q>` or `--file <path>` | `constructive api query <document>` or `constructive api mutate <document>`, with `@file` or `-` for stdin |
| `cnc server`, `cnc explorer`, `cnc codegen` | the same, with the same flags |

- **Stored settings are not moved.** 8.x kept contexts and tokens under `~/.cnc`; 9.0.0 does not read or migrate them. Add each backend again with `context add` or `login --api-endpoint`.
- **The person's key lasts 30 days.** `login` makes an API key that lasts 30 days and ends the password sign-in. Sign in again before the key ends; `whoami` and `status` warn a week before.
- **Agents have their own key.** `agent add` and `setup agent` make a 30-day key for the agent's principal, with a fresh sign-in of the person. The CLI uses the key to get a short-lived token, keeps that token, and uses it again until it ends; whoever holds the key can act as the agent until the key ends, the person renews it, or `agent remove` deletes the agent. `agent renew` gives it a new key. A person's `logout` leaves agents live; `agent remove` ends one.
- **The host asks the person before each write through MCP.** `mcp` without `--as` serves only the tools that read unless `--write` is given; each tool that writes asks the person in hosts that support it, and tools that can lose data are not served.
- **Rules are given as rules.** `table add` needs at least one `--rule`, and `access set` and `access add` take `--rule`, in the one rule shape; access presets are gone.
- **Nothing is set up in the project but the binding.** `db create` and `db use` write the binding to `.env` and clone or install no app. `setup agent` creates a host's MCP file only where there is none, and installs no skill.
