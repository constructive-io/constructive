/** A value a switch over a closed union cannot hold: a new variant is a compile error at the call. */
export function unreachable(value: never): never {
  throw new Error(
    `permissions: the analysis reached a state it does not handle (${JSON.stringify(value)}). This is a bug in @agentic-kit/permissions; report it with the command that caused it.`
  );
}
