# @constructive-db/machine-protocol

The wire protocol shared by the machine relay (`compute/services/machine-relay` in constructive-db)
and the machine runner (`agentic/machine-runner`): the JSON frames a remote
session is made of — `open`, `input`, `resize`, `close` from the client side;
`output`, `exit`, `error` from the runner side; `attached` from the relay — and
the codec that encodes them and refuses malformed ones.

The relay never interprets terminal bytes: `input` flows client → runner and
`output` flows runner → client as opaque UTF-8 strings. Everything else is
session lifecycle. The package has no dependencies so the relay can carry it
into the functions image without dragging the runner's native pty bindings
along.

## Two legs, two vocabularies

The runner leg — what a runner sends and receives — is the generic subset:
`open` (`command`, `args`, `interactive`, `cols`, `rows`, `cwd`), `input`,
`resize`, `signal`, `detach`, `reattach`, `close` in; `output` (with an
optional `stream: 'stdout' | 'stderr'` for a process on pipes), `exit`,
`error`, `scrollback` out; plus enrollment and credential exchange. A runner
never sees anything else, and never parses `output`.

The agent vocabulary is the client leg's, spoken between a client and the
relay: an `open` may carry a binding (`runId`, `agentMode`, `cliSessionId`,
resolved by `agentBinding`), and the relay turns a bound program's stdout
lines into `agent_event` frames (`assertAgentEvent`). An approval decision is
not a frame at all on the runner side: the relay writes it to the program's
stdin as one JSON line (`encodeApprovalDecisionLine` /
`parseApprovalDecisionLine`), which `constructive-agent-cli` reads. The runner
carried bytes.
