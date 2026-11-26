/**
 * Why the analyzer has not read the whole command: one of its own limits, or
 * text its lexer cannot parse. What it did not read can touch any path, so
 * each one reports through `Analyzer.incomplete`, which raises
 * `unresolvable-path`: it asks in every mode, Full included. A new limit adds
 * a member here.
 */
export type Limit =
  /** A command substitution nested deeper than the lexer reads. */
  | 'substitution-depth'
  /** A shell string (`sh -c`, `eval`, …) nested deeper than the analyzer reads. */
  | 'shell-string-depth'
  /** A command longer than the analyzer reads. */
  | 'command-length'
  /** The command's expansions build more text than the analysis holds. */
  | 'expansion-chars'
  /** The command's expansions make more words than are checked. */
  | 'expansion-words'
  /** The lexer could not parse the command, or a substitution in it. */
  | 'unparsed';
