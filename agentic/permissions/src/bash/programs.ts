/**
 * The program registry: for each program (and git subcommand) the analysis
 * reads options for, how it reads them and what each option does. The
 * analyzer's rules and the prefix guard both read options through it with
 * `readArgs`/`optionSpecs`, so they cannot disagree on an option. Options with
 * no effect are listed when they take a value, so the value is not read as an
 * operand.
 */

import type { Effect, OptionSpec, ProgramSpec } from './options';

const flag = (...names: string[]): OptionSpec => ({ names, value: 'none' });
const value = (...names: string[]): OptionSpec => ({ names, value: 'required' });
const does = (effect: Effect, value: OptionSpec['value'], ...names: string[]): OptionSpec => ({ names, value, effect });

/** git's own options, before the subcommand. git reads them by exact name only. */
export const GIT: ProgramSpec = {
  abbreviations: false,
  stopAtOperand: true,
  options: [
    does('changes-dir', 'required', '-C'),
    does('sets-config', 'required', '-c', '--config-env'),
    does('reads-file', 'required', '--git-dir', '--work-tree'),
    does('runs-program', 'optional', '--exec-path'),
    value('--namespace', '--super-prefix', '--list-cmds', '--attr-source'),
    flag('-p', '--paginate', '-P', '--no-pager', '--bare', '--no-replace-objects', '--literal-pathspecs', '--glob-pathspecs'),
    flag('--noglob-pathspecs', '--icase-pathspecs', '--no-optional-locks', '--no-advice', '-v', '--version', '-h', '--help')
  ]
};

/** Options many git subcommands share. */
const MESSAGE = [value('-m', '--message'), does('reads-file', 'required', '-F', '--file')];
const PATHSPEC_FILE = does('reads-file', 'required', '--pathspec-from-file');
/** The diff options: an external diff driver or textconv filter runs a program, and `--output` writes a file. */
const DIFF = [
  does('writes-file', 'required', '--output'),
  does('runs-program', 'none', '--ext-diff', '--textconv'),
  does('reads-file', 'required', '-O'),
  value('--format', '--pretty', '-n', '--max-count', '--since', '--until', '--author', '--grep', '-S', '-G', '--skip')
];
const UPLOAD_PACK = does('runs-program', 'required', '--upload-pack');

const sub = (...options: (OptionSpec | OptionSpec[])[]): ProgramSpec => ({
  abbreviations: true,
  stopAtOperand: false,
  options: options.flat()
});

/** Rewriting or deleting history and refs, as git's own documentation names each form. */
const REWRITES = (...names: string[]): OptionSpec => does('rewrites-history', 'none', ...names);

/**
 * A subcommand the registry does not list (or an alias) gets the options that
 * run a program, write a file or send data anywhere in git, so an alias that
 * expands to one still counts.
 */
export const GIT_OTHER: ProgramSpec = sub(
  DIFF,
  MESSAGE,
  UPLOAD_PACK,
  does('runs-program', 'required', '-x', '--exec', '--receive-pack', '--extcmd'),
  does('runs-program', 'optional', '--open-files-in-pager'),
  does('sends-to', 'required', '--repo'),
  value('-C', '-c', '-o')
);

/** git subcommands by name. */
export const GIT_SUBCOMMANDS: ReadonlyMap<string, ProgramSpec> = new Map([
  ['clone', sub(does('sets-config', 'required', '-c', '--config'), does('runs-program', 'required', '-u', '--upload-pack', '--template'), value('-o', '--origin', '-b', '--branch', '--depth', '--reference', '--separate-git-dir', '-j', '--jobs'))],
  [
    'fetch',
    {
      // `--update-head-ok` lets fetch move the branch that is checked out; `-P` deletes and clobbers local tags.
      ...sub(UPLOAD_PACK, REWRITES('-f', '--force', '-P', '--prune-tags', '-u', '--update-head-ok'), value('-j', '--jobs', '--depth', '--deepen', '--shallow-since', '--refmap', '-o', '--server-option')),
      operandEffects: [{ prefix: '+', effect: 'rewrites-history' }]
    }
  ],
  ['pull', sub(UPLOAD_PACK, value('-s', '--strategy', '-X', '--strategy-option', '--depth', '-j', '--jobs'))],
  ['ls-remote', sub(does('runs-program', 'required', '-u', '--upload-pack'), value('--sort', '-o', '--server-option'))],
  [
    'push',
    sub(
      does('runs-program', 'required', '--receive-pack', '--exec'),
      does('sends-to', 'required', '--repo'),
      value('-o', '--push-option'),
      { names: ['--force-with-lease'], value: 'optional' },
      flag('-f', '--force', '--force-if-includes', '--mirror', '-d', '--delete', '--prune', '--all', '--tags')
    )
  ],
  ['archive', sub(does('runs-program', 'required', '--exec'), does('writes-file', 'required', '-o', '--output'), value('--remote', '--prefix', '--format', '--add-file'))],
  ['rebase', sub(does('runs-program', 'required', '-x', '--exec'), value('--onto', '-s', '--strategy', '-X', '--strategy-option'))],
  ['grep', sub(does('runs-program', 'optional', '-O', '--open-files-in-pager'), does('reads-file', 'required', '-f'), value('-e', '-A', '-B', '-C', '--context', '-m', '--max-count', '--max-depth', '--threads'))],
  ['difftool', sub(does('runs-program', 'required', '-x', '--extcmd'), value('-t', '--tool'), DIFF)],
  [
    'filter-branch',
    sub(
      does('runs-program', 'required', '--setup', '--env-filter', '--tree-filter', '--index-filter', '--parent-filter', '--msg-filter'),
      does('runs-program', 'required', '--commit-filter', '--tag-name-filter'),
      value('--subdirectory-filter', '--prune-empty', '-d', '--original')
    )
  ],
  ['send-email', sub(does('runs-program', 'required', '--to-cmd', '--cc-cmd', '--header-cmd', '--sendmail-cmd'), value('--to', '--cc', '--bcc', '--from', '--subject', '--in-reply-to', '--smtp-server'))],
  ['diff', sub(DIFF)],
  ['log', sub(DIFF)],
  ['show', sub(DIFF)],
  ['whatchanged', sub(DIFF)],
  ['format-patch', sub(DIFF, does('writes-file', 'required', '-o', '--output-directory'))],
  ['commit', sub(MESSAGE, PATHSPEC_FILE, REWRITES('--amend'), does('reads-file', 'required', '-t', '--template'), value('-C', '--reuse-message', '-c', '--reedit-message', '--author', '--date', '--fixup', '--squash'))],
  ['tag', sub(MESSAGE, REWRITES('-d', '--delete', '-f', '--force'), value('-u', '--local-user'))],
  ['reflog', { ...sub(), operandEffects: [{ first: 'expire', effect: 'rewrites-history' }, { first: 'delete', effect: 'rewrites-history' }] }],
  ['merge', sub(MESSAGE, value('-s', '--strategy', '-X', '--strategy-option'))],
  ['notes', sub(MESSAGE, value('-C', '--reuse-message', '-c', '--reedit-message', '--ref'))],
  ['add', sub(PATHSPEC_FILE, value('--chmod'), flag('-f', '--force'))],
  ['checkout', sub(PATHSPEC_FILE, value('-b', '-B', '--orphan'))],
  ['switch', sub(value('-c', '--create', '-C', '--force-create', '--orphan'))],
  ['reset', sub(PATHSPEC_FILE, flag('--hard', '--soft', '--mixed', '--keep', '--merge'))],
  ['clean', sub(flag('-f', '--force', '-d', '-x', '-X', '-n', '--dry-run'), value('-e', '--exclude'))],
  ['restore', sub(PATHSPEC_FILE, value('-s', '--source'))],
  ['rm', sub(PATHSPEC_FILE)],
  ['stash', sub(PATHSPEC_FILE, value('-m', '--message'))],
  ['remote', sub(value('-t', '-m'))],
  [
    'config',
    sub(
      does('writes-file', 'required', '-f', '--file'),
      value('--blob', '--type', '--default'),
      flag('--get', '--get-all', '--get-regexp', '--get-urlmatch', '-l', '--list', '--show-origin', '--global', '--system', '--local'),
      flag('--add', '--unset', '--unset-all', '--replace-all', '--rename-section', '--remove-section', '-e', '--edit')
    )
  ],
  ['status', sub()],
  ['cherry-pick', sub(flag('-x', '-n', '--no-commit', '-e', '--edit', '-s', '--signoff', '--ff'), value('-m', '--mainline', '--strategy', '-X', '--strategy-option', '--cleanup', '--empty'))],
  ['revert', sub(flag('-n', '--no-commit', '-e', '--edit', '-s', '--signoff'), value('-m', '--mainline', '--strategy', '-X', '--strategy-option', '--cleanup'))],
  ['bisect', sub(value('--term-old', '--term-new', '--term-bad', '--term-good'))],
  ['submodule', sub(value('--reference', '--depth', '-b', '--branch', '--name', '-j', '--jobs'))],
  [
    'branch',
    sub(
      REWRITES('-d', '--delete', '-D', '-f', '--force', '-M', '-C'),
      flag('-m', '--move', '-c', '--copy'),
      value('-u', '--set-upstream-to', '--format', '--sort', '--contains', '--no-contains', '--merged', '--no-merged', '--points-at')
    )
  ]
]);

/** The spec of a git subcommand. */
export function gitSubcommand(name: string | undefined): ProgramSpec {
  return (name !== undefined && GIT_SUBCOMMANDS.get(name)) || GIT_OTHER;
}

/** npm, pnpm and yarn: options that run a program, load config or move the project. */
const PACKAGE_MANAGER: ProgramSpec = {
  abbreviations: true,
  stopAtOperand: false,
  options: [
    // A config file can set the script shell, so loading one runs what it names.
    does('runs-program', 'required', '--script-shell', '--node-options', '--userconfig', '--globalconfig', '--config'),
    does('changes-dir', 'required', '--prefix', '-C', '--dir', '--cwd')
  ]
};

/** The programs whose options a prefix guard reads, by program name. */
export const PROGRAMS: ReadonlyMap<string, ProgramSpec> = new Map([
  ['npm', PACKAGE_MANAGER],
  ['pnpm', PACKAGE_MANAGER],
  ['yarn', PACKAGE_MANAGER],
  [
    'bun',
    {
      abbreviations: true,
      stopAtOperand: false,
      options: [
        does('runs-program', 'required', '--preload', '-r', '--require', '--config', '-c'),
        does('changes-dir', 'required', '--cwd')
      ]
    }
  ]
]);

/** The whole value is a shell command the program runs (`tar --to-command`, ssh's `ProxyCommand`). */
const WHOLE = /^([\s\S]*)$/;
const runsShell = (value: OptionSpec['value'], ...names: string[]): OptionSpec => ({ names, value, effect: 'runs-program', shell: WHOLE });

/** tar: the options that run a program or a shell command, and the ones that take a value. */
export const TAR: ProgramSpec = sub(
  runsShell('required', '--to-command', '-I', '--use-compress-program', '--rsh-command', '--rmt-command', '-F', '--info-script', '--new-volume-script'),
  { names: ['--checkpoint-action'], value: 'required', effect: 'runs-program', when: /^exec=/, shell: /^exec=([\s\S]*)$/ },
  does('reads-file', 'required', '-T', '--files-from', '-X', '--exclude-from'),
  does('changes-dir', 'required', '-C', '--directory'),
  value('-f', '--file', '-b', '--blocking-factor', '-H', '--format', '-K', '-N', '-L', '-V', '--exclude', '--transform', '--owner', '--group', '--mode', '--mtime')
);

/** zip: `-TT` names the command that tests the archive; zip runs it through a shell. */
export const ZIP: ProgramSpec = sub(
  runsShell('required', '-TT', '--unzip-command'),
  does('writes-file', 'required', '-O', '--output-file'),
  flag('-@', '--names-stdin'),
  value('-b', '--temp-path', '-n', '--suffixes', '-P', '--password', '-t', '--from-date', '-tt', '--before-date', '-Z', '--compression-method')
);

/** sort: `--compress-program` names a program sort runs; `-o` writes a file. */
export const SORT: ProgramSpec = sub(
  does('runs-program', 'required', '--compress-program'),
  does('writes-file', 'required', '-o', '--output', '-T', '--temporary-directory'),
  does('reads-file', 'required', '--files0-from', '--random-source'),
  value('-k', '--key', '-t', '--field-separator', '-S', '--buffer-size', '--parallel', '--batch-size')
);

/** ssh's `-o` keys whose value is a command ssh runs on this machine through a shell. */
const SSH_COMMAND_KEYS = /^\s*(ProxyCommand|LocalCommand|KnownHostsCommand)\s*[= ]/i;
const SSH_OPTION: OptionSpec = {
  names: ['-o'],
  value: 'required',
  effect: 'runs-program',
  when: SSH_COMMAND_KEYS,
  shell: /^\s*(?:ProxyCommand|LocalCommand|KnownHostsCommand)\s*[= ]\s*([\s\S]*)$/i
};

/** ssh: `-o ProxyCommand=…` runs a command here, `-F` loads a config file, `-i` reads a key. */
export const SSH: ProgramSpec = {
  abbreviations: false,
  stopAtOperand: true,
  options: [
    SSH_OPTION,
    does('reads-file', 'required', '-i', '-F'),
    value('-J', '-L', '-R', '-D', '-p', '-l', '-E', '-S', '-W', '-b', '-B', '-c', '-e', '-I', '-m', '-O', '-P', '-Q', '-w')
  ]
};

/** scp: like ssh, and `-S` names the program it runs in place of ssh. */
export const SCP: ProgramSpec = {
  abbreviations: false,
  stopAtOperand: false,
  options: [SSH_OPTION, does('runs-program', 'required', '-S'), does('reads-file', 'required', '-i', '-F'), value('-P', '-c', '-l', '-J', '-D', '-X')]
};

/** rsync: `-e`/`--rsh` is the remote shell command, which rsync runs here. */
export const RSYNC: ProgramSpec = sub(
  runsShell('required', '-e', '--rsh'),
  does('reads-file', 'required', '--exclude-from', '--include-from', '--files-from', '--password-file'),
  does('writes-file', 'required', '--log-file'),
  value('-f', '--filter', '--exclude', '--include', '--rsync-path', '-T', '--temp-dir', '--backup-dir', '--partial-dir', '--compare-dest', '--copy-dest', '--link-dest')
);

/** man: `-P` is the pager and `-H` the browser, which man runs through a shell. */
export const MAN: ProgramSpec = sub(
  runsShell('required', '-P', '--pager'),
  runsShell('optional', '-H', '--html'),
  does('reads-file', 'required', '-C', '--config-file'),
  value('-M', '--manpath', '-S', '-s', '--sections', '-L', '--locale', '-m', '--systems', '-e', '--extension', '-p', '--preprocessor', '-R', '--recode')
);

/** A shell command a program's own text runs, captured in group 1 of a global pattern. */
export interface ShellCapture {
  readonly pattern: RegExp;
  /** The capture is an SQL string literal, where `''` stands for `'`. */
  readonly sqlQuoted?: boolean;
}

/** A program's own command language, and its commands that run a program. */
export interface CommandLanguage {
  /** A command that runs a shell or a program, or loads native code. */
  readonly runs: RegExp;
  /** The shell commands it runs, which the analysis reads as bash. */
  readonly shells: readonly ShellCapture[];
}

/** A program that runs text in its own command language, from options, operands and stdin. */
export interface TextProgram {
  readonly spec: ProgramSpec;
  readonly language: CommandLanguage;
  /** Options whose value is text in the language (`psql -c`, `mysql -e`, `sqlite3 -cmd`). */
  readonly textOptions: readonly string[];
  /** Options that give it a script file, so it reads none from stdin (`psql -f`). */
  readonly fileOptions: readonly string[];
  /** Operands from this index on are text in the language (sqlite3's after the database). */
  readonly textFrom?: number;
  /** An operand that starts with `+` is text in the language (vim's `+cmd`). */
  readonly plusText?: boolean;
  /** It reads text from stdin when no option or operand gives it. */
  readonly readsStdin: boolean;
}

/** Any text is code the analysis cannot read (PowerShell, Tcl, vim commands). */
const OPAQUE: CommandLanguage = { runs: /\S/, shells: [] };

/** psql's meta-commands: `\!` runs a shell, `\o |`/`\g |`/`\w |` pipe to one, and `COPY … PROGRAM` runs a program. */
const PSQL_LANGUAGE: CommandLanguage = {
  runs: /\\!|\\[ogw]\s*\||\bcopy\b[^;]*\bprogram\b/i,
  shells: [
    { pattern: /\\!\s*([^\n]*)/g },
    { pattern: /\\[ogw]\s*\|\s*([^\n]*)/g },
    { pattern: /\bprogram\s+'((?:[^']|'')*)'/gi, sqlQuoted: true }
  ]
};

/** sqlite3's and duckdb's dot-commands: `.shell`/`.system` run one, `.output|`/`.once|`/`.import|`/`.read|` pipe, `.load` loads native code. */
const SQLITE_LANGUAGE: CommandLanguage = {
  runs: /\.(shell|system|load|excel)\b|\.(output|once|import|read)\s+['"]?\||\bedit\s*\(/i,
  shells: [{ pattern: /\.(?:shell|system)\s+([^\n]*)/gi }, { pattern: /\.(?:output|once|import|read)\s+['"]?\|\s*([^\n'"]*)/gi }]
};

/** mysql's client commands: `system`/`\!` run a shell command, `pager`/`\P` pipe output to one. */
const MYSQL_LANGUAGE: CommandLanguage = {
  runs: /(?:^|[\n;])\s*(?:system|pager)\s|\\[!P]/i,
  shells: [{ pattern: /(?:^|[\n;])\s*(?:system|pager)\s+([^\n]*)/gi }, { pattern: /\\[!P]\s*([^\n]*)/g }]
};

/** gdb commands that run a shell or a program: `shell`/`!`, `pipe`/`|`, `python`, `guile`, `make`. */
const GDB_LANGUAGE: CommandLanguage = {
  runs: /^\s*(?:!|\||(?:shell|pipe|python|py|pi|python-interactive|guile|gu|make)\b)/m,
  shells: [{ pattern: /^\s*(?:shell\s+|!)([^\n]*)/gm }]
};

/** Any vim command can run code; `!` hands the rest to a shell. */
const VIM_LANGUAGE: CommandLanguage = { runs: /\S/, shells: [{ pattern: /!([^\n]*)/g }] };

const PSQL: TextProgram = {
  spec: sub(
    { names: ['-o', '--output'], value: 'required', effect: 'runs-program', when: /^\s*\|/, shell: /^\s*\|\s*([\s\S]*)$/ },
    { names: ['-o', '--output', '-L', '--log-file'], value: 'required', effect: 'writes-file', when: /^(?!\s*\|)/ },
    does('reads-file', 'required', '-f', '--file'),
    value('-c', '--command', '-d', '--dbname', '-h', '--host', '-p', '--port', '-U', '--username', '-v', '--set', '--variable'),
    value('-P', '--pset', '-F', '--field-separator', '-R', '--record-separator', '-T', '--table-attr')
  ),
  language: PSQL_LANGUAGE,
  textOptions: ['-c', '--command'],
  fileOptions: ['-f', '--file'],
  readsStdin: true
};

const SQLITE_FLAGS = ['-bail', '-batch', '-csv', '-json', '-line', '-list', '-html', '-box', '-column', '-markdown', '-table', '-header'];

const SQLITE3: TextProgram = {
  spec: {
    abbreviations: false,
    stopAtOperand: false,
    singleDash: true,
    options: [
      value('-cmd', '--cmd', '-separator', '-newline', '-nullvalue', '-escape', '-maxsize'),
      does('reads-file', 'required', '-init', '--init'),
      flag(...SQLITE_FLAGS, '-noheader', '-echo', '-interactive', '-readonly', '-safe', '-version', '-help')
    ]
  },
  language: SQLITE_LANGUAGE,
  textOptions: ['-cmd', '--cmd'],
  fileOptions: [],
  textFrom: 1,
  readsStdin: true
};

const DUCKDB: TextProgram = {
  spec: {
    abbreviations: false,
    stopAtOperand: false,
    singleDash: true,
    options: [value('-c', '-cmd', '-s', '-separator', '-newline', '-nullvalue'), does('reads-file', 'required', '-f', '-init'), flag(...SQLITE_FLAGS, '-readonly', '-unsigned')]
  },
  language: SQLITE_LANGUAGE,
  textOptions: ['-c', '-cmd', '-s'],
  fileOptions: ['-f'],
  textFrom: 1,
  readsStdin: true
};

const MYSQL: TextProgram = {
  spec: sub(
    runsShell('optional', '--pager'),
    // A defaults file can set the pager, and a plugin is native code.
    does('runs-program', 'required', '--defaults-file', '--defaults-extra-file', '--plugin-dir', '--default-auth'),
    does('writes-file', 'required', '--tee'),
    value('-e', '--execute', '-D', '--database', '-h', '--host', '-u', '--user', '-P', '--port', '-S', '--socket', '--init-command'),
    { names: ['-p', '--password'], value: 'optional' }
  ),
  language: MYSQL_LANGUAGE,
  textOptions: ['-e', '--execute'],
  fileOptions: [],
  readsStdin: true
};

const PWSH: TextProgram = {
  spec: {
    abbreviations: true,
    stopAtOperand: true,
    singleDash: true,
    anyCase: true,
    options: [
      value('-Command', '-c', '-EncodedCommand', '-e', '-ec', '-CommandWithArgs', '-cwa', '-ExecutionPolicy', '-ep'),
      does('reads-file', 'required', '-File', '-f'),
      does('changes-dir', 'required', '-WorkingDirectory', '-wd'),
      flag('-NoProfile', '-nop', '-NonInteractive', '-NoLogo', '-Version', '-Help', '-Login', '-l')
    ]
  },
  language: OPAQUE,
  textOptions: ['-Command', '-c', '-EncodedCommand', '-e', '-ec', '-CommandWithArgs', '-cwa'],
  fileOptions: ['-File', '-f'],
  readsStdin: true
};

const GDB: TextProgram = {
  spec: {
    abbreviations: true,
    stopAtOperand: false,
    singleDash: true,
    options: [
      value('-ex', '--ex', '-eval-command', '--eval-command', '-iex', '--iex', '-init-eval-command', '--init-eval-command'),
      does('reads-file', 'required', '-x', '--command', '-command', '-ix', '--init-command', '-init-command'),
      does('changes-dir', 'required', '-cd', '--cd'),
      value('-p', '--pid', '-d', '--directory', '-s', '--symbols', '-c', '--core', '-se', '-e', '--exec'),
      flag('-batch', '--batch', '-nx', '--nx', '-n', '-q', '--quiet', '-silent', '--args')
    ]
  },
  language: GDB_LANGUAGE,
  textOptions: ['-ex', '--ex', '-eval-command', '--eval-command', '-iex', '--iex', '-init-eval-command', '--init-eval-command'],
  fileOptions: ['-x', '--command', '-command'],
  readsStdin: true
};

const VIM: TextProgram = {
  spec: sub(
    value('-c', '--cmd', '-T'),
    flag('-r'),
    does('reads-file', 'required', '-i'),
    does('writes-file', 'required', '-i'),
    does('reads-file', 'optional', '-S'),
    does('reads-file', 'required', '-u', '-U', '-s'),
    does('writes-file', 'required', '-w', '-W')
  ),
  language: VIM_LANGUAGE,
  textOptions: ['-c', '--cmd'],
  fileOptions: [],
  plusText: true,
  readsStdin: false
};

const EXPECT: TextProgram = {
  spec: sub(value('-c', '-D'), does('reads-file', 'required', '-f', '-b'), flag('-d', '-i', '-n', '-N', '-v')),
  language: OPAQUE,
  textOptions: ['-c'],
  fileOptions: ['-f'],
  readsStdin: true
};

/** Programs that run text in their own command language, by program name. */
export const TEXT_PROGRAMS: ReadonlyMap<string, TextProgram> = new Map([
  ['psql', PSQL],
  ['sqlite3', SQLITE3],
  ['duckdb', DUCKDB],
  ['mysql', MYSQL],
  ['mariadb', MYSQL],
  ['pwsh', PWSH],
  ['powershell', PWSH],
  ['gdb', GDB],
  ['vim', VIM],
  ['vi', VIM],
  ['nvim', VIM],
  ['view', VIM],
  ['expect', EXPECT]
]);
