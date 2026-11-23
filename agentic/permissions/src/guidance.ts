/**
 * What the model should do next when a call stops, by why it stopped. The
 * wording lives here only, so every reason says it the same way.
 */
export const NEXT_STEP = {
  /** A credential store or a protected path: no spelling of the call is allowed. */
  blocked: "Don't reach it another way, split the command or put it in a script; if the task needs it, ask the user to do it.",
  /** The analysis could not read the whole command. */
  unread: "Don't split it or put it in a script; rewrite it as simpler commands, or use the read tool to read a file."
} as const;
