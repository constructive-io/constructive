# @constructive-db/machine-protocol

The wire protocol shared by the machine relay (`compute/services/machine-relay`)
and the machine runner (`compute/lib/machine-runner`): the JSON frames a remote
session is made of — `open`, `input`, `resize`, `close` from the client side;
`output`, `exit`, `error` from the runner side; `attached` from the relay — and
the codec that encodes them and refuses malformed ones.

The relay never interprets terminal bytes: `input` flows client → runner and
`output` flows runner → client as opaque UTF-8 strings. Everything else is
session lifecycle. The package has no dependencies so the relay can carry it
into the functions image without dragging the runner's native pty bindings
along.
