/**
 * The command languages of programs that run their own text (psql, sqlite3,
 * duckdb, mysql, gdb, vim, …). Text is plain only when it uses none of the
 * language's escape mechanisms: plain statements, and the read-only commands
 * each tool's own help lists. Anything else is an escape, and the analysis
 * asks for it. Where an escape shows the shell command it runs, that command
 * is handed back to be analyzed as bash, so a credential read in it is denied
 * in every mode.
 */

/** What a text in a command language does. */
export interface TextReading {
  /** It uses an escape: a command that can run a program, read or write a file, or change where the program runs. */
  readonly escapes: boolean;
  /** The shell commands it runs, where the text shows them. */
  readonly shells: readonly string[];
}

export type CommandLanguage = (text: string) => TextReading;

/** Any text is code the analysis cannot read (PowerShell, Tcl). */
export const OPAQUE: CommandLanguage = (text) => ({ escapes: /\S/.test(text), shells: [] });

/**
 * vim: any command can run code; `!` hands the rest of the line to a shell.
 */
export const VIM: CommandLanguage = (text) => ({ escapes: /\S/.test(text), shells: [...text.matchAll(/!([^\n]*)/g)].map((m) => m[1]) });

/**
 * gdb: any command text can run code (`print` and `call` run functions in the
 * program), so it is never plain. `shell` (and its unique abbreviations) and
 * `!` hand the rest of the line to a shell; `pipe` and `|` hand it what
 * follows the first `|` after the gdb command, unless `-d` sets another
 * delimiter.
 */
export const GDB: CommandLanguage = (text) => ({
  escapes: /\S/.test(text),
  shells: [
    ...[...text.matchAll(/^\s*(?:(?:she|shel|shell)\s+|!)([^\n]*)/gm)].map((m) => m[1]),
    ...[...text.matchAll(/^\s*(?:(?:pip|pipe)\s+(?!-d)|\|)[^|\n]*\|([^\n]*)/gm)].map((m) => m[1])
  ]
});

/**
 * psql meta-commands that only describe the database, format or print output,
 * from `psql --help=commands`. `\g` and `\gx` count only with no argument, as
 * the end of a query, and `\pset` only when it does not set the pager program.
 */
const PSQL_READ_ONLY = new Set([
  'l', 'list', 'lo_list', 'sf', 'sv', 'z', 'conninfo', 'encoding', 'timing', 'x', 'a', 't', 'H', 'C', 'f', 'T', 'pset',
  'q', '?', 'h', 'help', 'copyright', 'errverbose', 'p', 'r', 'echo', 'qecho', 'warn', 'gdesc', 'crosstabview'
]);

interface MetaCommand {
  name: string;
  args: string;
}

/**
 * Every place psql text may hold a meta-command. A meta-command's name runs
 * from its backslash to a space or the next backslash, as psql reads it, and
 * its arguments run to the end of the line. Each backslash counts, also one
 * in a SQL string or comment: whether psql reads it as one depends on the
 * string's kind and the server's `standard_conforming_strings`, so a
 * backslash that is not a read-only meta-command is never plain. `\\` only
 * separates.
 */
function psqlMetaCommands(text: string): MetaCommand[] {
  const commands: MetaCommand[] = [];
  for (let i = text.indexOf('\\'); i >= 0; i = text.indexOf('\\', i)) {
    if (text[i + 1] === '\\') {
      i += 2;
      continue;
    }
    let from = i + 1;
    while (from < text.length && !/[\s\\]/.test(text[from])) from++;
    const name = text.slice(i + 1, from);
    let end = from;
    while (end < text.length && text[end] !== '\n' && text[end] !== '\\') end++;
    commands.push({ name, args: text.slice(from, end) });
    i = end;
  }
  return commands;
}

function psqlReadOnly({ name, args }: MetaCommand): boolean {
  if (/[`:|]/.test(args)) return false;
  if (name === 'g' || name === 'gx') return args.trim() === '';
  if (name === 'pset') return !/^\s*pager/.test(args);
  return PSQL_READ_ONLY.has(name) || /^(?:d[A-Za-z]*|l|sf|sv|z|lo_list)[Sx+]*$/.test(name);
}

/**
 * psql: a backquote (its text runs in a shell), SQL `COPY … PROGRAM`, and
 * any meta-command but the read-only ones (`\!`, a pipe, a file, an editor,
 * `\i`, `\cd`, `\set`, a variable from `:name`) are escapes.
 */
export const PSQL: CommandLanguage = (text) => {
  const shells: string[] = [];
  let escapes = /\bcopy\b/i.test(text) && /\bprogram\b/i.test(text);
  for (const m of text.matchAll(/`([^`]*)`/g)) {
    escapes = true;
    shells.push(m[1]);
  }
  for (const m of text.matchAll(/\bprogram\s+'((?:[^']|'')*)'/gi)) shells.push(m[1].replace(/''/g, "'"));
  for (const meta of psqlMetaCommands(text)) {
    if (psqlReadOnly(meta)) continue;
    escapes = true;
    const pipe = /^(?:o|out|g|gx|w|write)$/.test(meta.name) ? /^\s*(?:\([^)]*\)\s*)?\|\s*([\s\S]*)$/.exec(meta.args) : null;
    if (meta.name === '!') shells.push(meta.args);
    else if (pipe) shells.push(pipe[1]);
  }
  return { escapes, shells };
};

/** sqlite3's and duckdb's dot-commands that only show the database or format output, from their `.help`; only the full spelling. */
const READ_ONLY_DOT = new Set([
  'tables', 'schema', 'fullschema', 'indexes', 'indices', 'databases', 'dbinfo', 'headers', 'header', 'mode', 'nullvalue', 'separator',
  'print', 'changes', 'timer', 'echo', 'bail', 'eqp', 'explain', 'stats', 'help', 'version', 'show', 'width', 'dump', 'columns', 'rows',
  'maxrows', 'maxwidth', 'quit', 'exit'
]);

/** sqlite3 and duckdb take any long enough prefix of a dot-command (`.sys` is `.system`, `.o` is `.output`). */
const prefixOf = (word: string, command: string, least: number) => word.length >= least && command.startsWith(word);

/**
 * The sqlite3 family: a line that starts with `.` is a dot-command, and every
 * one but the read-only full spellings is an escape. `.shell`/`.system`
 * run the rest of the line; `.output|`, `.once|`, `.import|` and `.read|`
 * pipe through a command. SQL that names one of the tool's functions in
 * `loadsCode` is an escape too.
 */
function dotCommands(loadsCode: RegExp): CommandLanguage {
  return (text) => {
    const shells: string[] = [];
    let escapes = loadsCode.test(text);
    for (const line of text.split('\n')) {
      const m = /^\s*\.(\S+)\s*(.*)$/.exec(line);
      if (!m || READ_ONLY_DOT.has(m[1])) continue;
      escapes = true;
      const [, word, rest] = m;
      if (prefixOf(word, 'shell', 2) || prefixOf(word, 'system', 2)) shells.push(rest);
      else if (['output', 'once', 'import', 'read'].some((c) => prefixOf(word, c, 1))) {
        const pipe = /^['"]?\|\s*([^'"]*)/.exec(rest);
        if (pipe) shells.push(pipe[1]);
      }
    }
    return { escapes, shells };
  };
}

/**
 * sqlite3 SQL with string literals is plain, since sqlite reads no string as
 * a file by itself. These words are not: the functions and modules that the
 * 3.54 CLI adds to the library (`pragma function_list`, `pragma
 * module_list`) and that read or write a file, run an editor, or run SQL from
 * a string, which `char()` can build; `load_extension`, which the CLI
 * enables; `ATTACH`; and `VACUUM`, since a comment can sit between it and
 * `INTO`. A name may be quoted or followed by a comment, so the bare word
 * counts.
 */
export const SQLITE = dotCommands(/\b(?:readfile|writefile|edit|fsdir|zipfile|sha1_query|sha3_query|load_extension|attach|vacuum)\b/i);

/** duckdb loads native code with `INSTALL` and `LOAD`. */
export const DUCKDB = dotCommands(/\b(?:install|load)\b/i);

/**
 * mysql's client commands and their short forms, from the manual's "mysql
 * Client Commands": the long form is the first word of a line in any case,
 * the short form a backslash and one character anywhere outside a string.
 */
const MYSQL_COMMANDS = new Map([
  ['help', 'h'], ['?', '?'], ['charset', 'C'], ['clear', 'c'], ['connect', 'r'], ['delimiter', 'd'], ['edit', 'e'], ['ego', 'G'], ['exit', 'q'],
  ['go', 'g'], ['nopager', 'n'], ['notee', 't'], ['nowarning', 'w'], ['pager', 'P'], ['print', 'p'], ['prompt', 'R'], ['query_attributes', ''],
  ['quit', 'q'], ['rehash', '#'], ['resetconnection', 'x'], ['source', '.'], ['ssl_session_data_print', ''], ['status', 's'], ['system', '!'],
  ['tee', 'T'], ['use', 'u'], ['warnings', 'W']
]);
/** The client commands that connect elsewhere, run an editor, a pager or a shell, or read or write a file. */
const MYSQL_ESCAPES = new Set(['connect', 'edit', 'pager', 'source', 'ssl_session_data_print', 'system', 'tee']);
const MYSQL_ESCAPE_SHORT = new Set([...MYSQL_ESCAPES].map((c) => MYSQL_COMMANDS.get(c)).filter((s) => s !== ''));
const MYSQL_SHORT = new Set([...MYSQL_COMMANDS.values()].filter((s) => s !== ''));

/**
 * mysql text with its strings, quoted identifiers and comments blanked
 * (newlines kept), so a backslash in them is not a command. Short forms still
 * run in `/*! … *\/` and `/*+ … *\/` comments, so those stay. `unsure`: a
 * string holds a backslash, and whether it ends the string depends on the
 * server's sql_mode.
 */
function mysqlCode(text: string): { code: string; unsure: boolean } {
  let unsure = false;
  const code = text.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`[^`]*`|\/\*(?![!+])[\s\S]*?\*\/|(?:--\s|#)[^\n]*/g, (m) => {
    if (/^['"]/.test(m) && m.includes('\\')) unsure = true;
    return m.replace(/[^\n]/g, ' ');
  });
  return { code, unsure };
}

/**
 * mysql: a client command that is not read-only is an escape, and so is a
 * backslash form mysql does not list. `system`/`\!` and `pager`/`\P` run the
 * rest of the line.
 */
export const MYSQL: CommandLanguage = (text) => {
  const { code, unsure } = mysqlCode(text);
  const lines = text.split('\n');
  const shells: string[] = [];
  let escapes = unsure;
  code.split('\n').forEach((line, k) => {
    const word = /^\s*([A-Za-z_?]+)/.exec(line)?.[1]?.toLowerCase();
    if (word && MYSQL_ESCAPES.has(word)) {
      escapes = true;
      if (word === 'system' || word === 'pager') shells.push(lines[k].replace(/^\s*\S+\s*/, '').replace(/;\s*$/, ''));
    }
    for (const m of line.matchAll(/\\(.)/g)) {
      if (MYSQL_SHORT.has(m[1]) && !MYSQL_ESCAPE_SHORT.has(m[1])) continue;
      escapes = true;
      if (m[1] === '!' || m[1] === 'P') shells.push(lines[k].slice(m.index + 2).split('\\')[0]);
    }
  });
  return { escapes, shells };
};
