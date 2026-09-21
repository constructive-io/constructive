# @agentic-kit/pi-host

The host side of a headless agent run. `@agentic-kit` already owns the loop
(`@agentic-kit/agent`), the tools (`@agentic-kit/pi`) and the gating policy
(`@agentic-kit/harness`); what a workload has to supply is the three small
host-shaped things those packages ask for, and nothing here re-implements any of
them.

| Existing contract | What this package supplies |
| --- | --- |
| `GateHost` (`@agentic-kit/harness`) | `createThreadGateHost` — approval through the conversation thread |
| `ConfirmGate` (`createConfirmGate`) | `createGatedToolset` — wraps `AgentTool.execute` with the harness gate |
| `PiToolsHost` (`@agentic-kit/pi/host`) | `createPiToolsHost` — built from values, not from a desktop session |
| `AgentEvent` (`@agentic-kit/agent`) | `TranscriptWriter` — events → `agent_message` / `agent_task` |

## Approval is a message, so `hasUI` is true

`GateHost.hasUI` does not mean "a window exists": it means a human decision is
obtainable. A Job can obtain one — it writes the pending call into the thread at
`approval-requested` and waits for the human to echo it back — so the runner
reports `true`. Reporting `false` would tell the harness no decision is possible
and every tool in `MUTATING_DB_TOOLS` would be refused before it ran.

The gate is the harness's. `createGatedToolset` calls `gate.onToolCall(...)` and,
when the gate blocks, returns the gate's own reason to the model as an ordinary
tool result — a declined call is information the agent can act on, not a crash.
pi's fs/edit/bash/git tools are not in `MUTATING_DB_TOOLS` and are never gated:
the whole point of the coding lane is that editing the clone is free.

## Credentials do not go in the clone

`@agentic-kit/pi` resolves tenant context with `resolveProjectContext(cwd)`,
which reads `<cwd>/.env` for `ACCESS_TOKEN` and `DATABASE_ID`. In this lane `cwd`
is a cloned git repository that the agent is about to `git add -A` and push, so
writing platform credentials there is a credential-exfiltration bug waiting for
a careless commit. The coding lane therefore runs with the coding tool set and no
project context in the work tree. A lane that genuinely needs control-plane tools
calls `materializeProjectContext({ dir, workTree, ... })`, which writes a `0600`
`.env` **outside** the work tree and throws
`ProjectContextInsideWorkTreeError` if asked to do otherwise.

## Persona

`loadPersona` / `loadPersonaSkills` / `selectPersona` turn an `agent_persona` row
and the `agent_resource` rows it names into the model, system prompt, temperature
and tool subset for the run. A persona that asks for a tool the lane does not
carry throws (`UnknownPersonaToolError`) rather than running with a quietly
smaller toolbox, and a named resource that is missing or inactive throws rather
than dropping a skill the operator expected to be in force.

## Tests

`pnpm test` — the gate against a fake thread (approve / decline / cancel /
timeout), the writer against a fake agent run, persona selection, the gated
toolset, and the project-context guard.
