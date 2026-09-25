# @constructive-db/agent-cli

`constructive-agent-cli`: a coding-agent CLI (`claude`, `codex`) adapted to the
machine protocol's **agent stdio contract**, so that a machine session bound to
an agent run can run one as an ordinary command.

```
constructive-agent-cli <claude|codex> [--resume <session-id>]
    [--approval-timeout-ms <n>] [--on-timeout deny|allow] [-- <cli args...>]
```

- **stdin** — the prompt, one line; then further prompts (turns, where the CLI
  supports them) or `{"kind":"approval_decision",...}` JSON lines answering a
  tool approval the CLI asked for.
- **stdout** — `AgentEvent` JSON lines, nothing else.
- **stderr** — everything the CLI says that is not its protocol.
- **exit** — the CLI's own status.

`--approval-timeout-ms` and `--on-timeout` default from
`CONSTRUCTIVE_AGENT_CLI_APPROVAL_TIMEOUT_MS` / `CONSTRUCTIVE_AGENT_CLI_ON_TIMEOUT`,
so a machine owner sets them once, in the runner policy's `env.set`.

## Where it sits

The **machine runner** (`@constructive-db/machine-runner`) is a remote control:
it runs the commands its policy allows, on pipes or in a pty, and streams bytes.
It knows nothing about agents. This program is what gives a session its agent
shape — the relay asks the runner to run `constructive-agent-cli claude` for a
`cli`-bound session, reads the events off its stdout, puts an approval on the
run's log, and writes the decision back as a stdin line. The runner reads
neither direction.

For this program to run on a machine, its policy must allow the command
(`"allowedCommands": ["constructive-agent-cli", ...]`) and the CLI itself must
be on the `PATH` that policy projects. The runner never runs `claude` or
`codex` directly.

The adapters (`ClaudeCodeAdapter`, `CodexExecAdapter`) and the session loop
(`runAgentCliSession`) are exported for use in-process.
