# @constructive-db/machine-runner

The machine runner: the Node daemon a user installs on their own machine for
Remote Control (constructive-planning#1690, phase 0). It dials **out** to a
machine relay over WebSocket — it never listens on a port — spawns
policy-checked processes in a pty (`node-pty`), and streams their bytes back
as `@constructive-db/machine-protocol` frames. When the relay connection
drops, it redials with exponential backoff and re-registers the machine.

## Install

```
npm i -g @constructive-db/machine-runner
```

MIT-licensed and dependency-light on purpose (`node-pty`, `ws`,
`@pgpmjs/logger`): it holds no database connection and no schema knowledge — every
authorization answer comes from the relay it dials.

## Usage

```
machine-runner enroll --relay wss://relay.example.com \
  --machine <machine-uuid> --database <database-uuid>
# the enrollment token is read from stdin or MACHINE_ENROLLMENT_TOKEN, never argv

machine-runner start          # dial the relay and serve sessions
machine-runner status         # what this runner is enrolled in, never secrets
```

`enroll` writes the config `start` reads: `~/.machine-runner/config.json` at
mode 0600, or wherever `--config <path>` / `MACHINE_RUNNER_CONFIG` points. A
bare `machine-runner --config <path>` still boots the daemon, which is how the
deployed unit and the bundle invoke it.

The config carries a **list of enrollments** — one per relay/database this
machine is enrolled in — plus the local policy:

```json
{
  "enrollments": [
    {
      "machineId": "<machine-uuid>",
      "relayUrl": "wss://relay.example.com",
      "token": "<machine token>",
      "database": "db-uuid"
    }
  ],
  "policy": {
    "allowedCommands": ["echo", "ls", "git"],
    "cwd": "/home/me/work",
    "env": {
      "allow": ["PATH", "HOME", "TERM", "LANG"],
      "set": { "CONSTRUCTIVE_SESSION": "1" }
    }
  }
}
```

The policy is decided here, on the machine, and never travels over the wire: a
command not in `allowedCommands` is refused with an error frame, sessions
start in the policy's `cwd`, and the spawned environment contains only the
allow-listed pass-through variables plus the explicit `set` map — the runner's
own environment (tokens included) never reaches a session.

## Sessions bound to an agent run

A session opened with a `runId` is the run's process rather than a terminal:
it runs on pipes, never in a pty, and its stdout lines that are machine-protocol
`AgentEvent`s are relayed as `agent_event` frames (the relay ledgers them
structurally); every other line is ordinary output. The runner spawns and
relays — it holds no harness, no run log and no model credentials, and depends
on nothing from `@agentic-kit/*`.

- `agentMode: 'cli'` — the command is a coding-agent CLI (`claude`, `codex`)
  whose stream-JSON the runner adapts; its tool approvals are asked through the
  relay and answered on the bound run's log.
- `agentMode: 'embedded'` — the command is an agent host, normally
  `constructive-agent-host` from `@constructive-db/agent-host`. To the runner it
  is **an ordinary allow-listed command**: it must appear in `allowedCommands`,
  it is spawned through the same policy path as everything else (policy `cwd`,
  allow-listed environment), and the runner adds only the binding as
  arguments — `--run <run_id>` and, when the client asked for one,
  `--cwd <dir>` — after the opener's own (`--harness <name>`, …). Which harness
  runs, where the run's log lives, how approvals are gated and how the host
  finds its platform credential are the host's concerns, documented in
  `compute/lib/agent-host`.

```json
"policy": {
  "allowedCommands": ["bash", "git", "constructive-agent-host"],
  "cwd": "/home/me/work",
  "env": { "allow": ["PATH", "HOME"] }
}
```
