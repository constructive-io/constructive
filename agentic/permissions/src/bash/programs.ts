/**
 * The program registry: for each program (and git subcommand) the analysis
 * reads options for, how it reads them and what each option does. The
 * analyzer's rules and the prefix guard both read options through it with
 * `readArgs`/`optionSpecs`, so they cannot disagree on an option. Options with
 * no effect are listed when they take a value, so the value is not read as an
 * operand.
 */

import type { Arg } from './analyze';
import { AT_FILE, FORM_FILES, NAME_AT_FILE, VARIABLE_FILE, WRITE_OUT_FILES } from './curl-forms';
import type { CommandLanguage } from './languages';
import * as languages from './languages';
import { type DirRepeat, type Effect, type FileForm, mayBeOption, type OptionSpec, type ProgramSpec, type ValueKind } from './options';

const flag = (...names: string[]): OptionSpec => ({ names, value: 'none' });
/** A flag with an effect (`--ext-diff` runs a program, `--amend` rewrites history). */
const flagDoes = (effect: Exclude<Effect, 'changes-dir'>, ...names: string[]): OptionSpec => ({ names, value: 'none', effect });
/** An option whose value is a `kind` of thing: a file it reads or writes, a dir, a program, config, a destination, or plain text. */
const does = (kind: Exclude<ValueKind, 'changes-dir'>, value: 'required' | 'optional', ...names: string[]): OptionSpec => ({ names, value, effect: kind });
/** An option whose value is a dir the program moves to; `repeat` says how a second one moves. */
const movesTo = (repeat: DirRepeat, ...names: string[]): OptionSpec => ({ names, value: 'required', effect: 'changes-dir', repeat });
const plain = (...names: string[]): OptionSpec => does('plain', 'required', ...names);
const optionalPlain = (...names: string[]): OptionSpec => does('plain', 'optional', ...names);

/** bash's builtins read their options with getopt, up to the first operand. */
const builtin = (...options: OptionSpec[]): ProgramSpec => ({ abbreviations: false, stopAtOperand: true, options });

/** `read [-ers] [-a array] [-d delim] [-i text] [-n|-N n] [-p prompt] [-t timeout] [-u fd] [name …]`. */
export const READ = builtin(plain('-a', '-d', '-i', '-n', '-N', '-p', '-t', '-u'), flag('-e', '-r', '-s'));

/** `printf -v name format …`: the builtin's only option. */
export const PRINTF = builtin(plain('-v'));

/** `mapfile`/`readarray [-d delim] [-n count] [-O origin] [-s count] [-t] [-u fd] [-C callback] [-c quantum] [array]`; the callback runs as code. */
export const MAPFILE = builtin(plain('-d', '-n', '-O', '-s', '-u', '-c'), does('runs-program', 'required', '-C'), flag('-t'));

/** `trap [-lpP] [action] [condition …]`: `-l` and `-p` (and bash 5.3's `-P`) only list. */
export const TRAP = builtin(flag('-l', '-p', '-P'));

/** `unset [-f|-v|-n] name …`: `-f` unsets functions, the others variables. */
export const UNSET = builtin(flag('-f', '-v', '-n'));

/** git's own options, before the subcommand. git reads them by exact name only. */
export const GIT: ProgramSpec = {
  abbreviations: false,
  stopAtOperand: true,
  options: [
    movesTo('cumulative', '-C'),
    does('sets-config', 'required', '-c', '--config-env'),
    does('reads-file', 'required', '--git-dir', '--work-tree'),
    does('runs-program', 'optional', '--exec-path'),
    plain('--namespace', '--super-prefix', '--list-cmds', '--attr-source'),
    flag('-p', '--paginate', '-P', '--no-pager', '--bare', '--no-replace-objects', '--literal-pathspecs', '--glob-pathspecs'),
    flag('--noglob-pathspecs', '--icase-pathspecs', '--no-optional-locks', '--no-advice', '-v', '--version', '-h', '--help')
  ]
};

/** Options many git subcommands share. */
const MESSAGE = [plain('-m', '--message'), does('reads-file', 'required', '-F', '--file')];
const PATHSPEC_FILE = does('reads-file', 'required', '--pathspec-from-file');
/** The diff options: an external diff driver or textconv filter runs a program, and `--output` writes a file. */
const DIFF = [
  does('writes-file', 'required', '--output'),
  flagDoes('runs-program', '--ext-diff', '--textconv'),
  does('reads-file', 'required', '-O'),
  plain('--format', '--pretty', '-n', '--max-count', '--since', '--until', '--author', '--grep', '-S', '-G', '--skip')
];
const UPLOAD_PACK = does('runs-program', 'required', '--upload-pack');

const sub = (...options: (OptionSpec | OptionSpec[])[]): ProgramSpec => ({
  abbreviations: true,
  stopAtOperand: false,
  options: options.flat()
});

/** Rewriting or deleting history and refs, as git's own documentation names each form. */
const REWRITES = (...names: string[]): OptionSpec => flagDoes('rewrites-history', ...names);

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
  plain('-C', '-c', '-o')
);

/** git subcommands by name. */
export const GIT_SUBCOMMANDS: ReadonlyMap<string, ProgramSpec> = new Map([
  [
    'clone',
    sub(
      does('sets-config', 'required', '-c', '--config'),
      does('runs-program', 'required', '-u', '--upload-pack', '--template'),
      does('reads-file', 'required', '--reference', '--reference-if-able'),
      does('writes-file', 'required', '--separate-git-dir'),
      plain('-o', '--origin', '-b', '--branch', '--depth', '-j', '--jobs')
    )
  ],
  [
    'fetch',
    {
      // `--update-head-ok` lets fetch move the branch that is checked out; `-P` deletes and clobbers local tags.
      ...sub(UPLOAD_PACK, REWRITES('-f', '--force', '-P', '--prune-tags', '-u', '--update-head-ok'), plain('-j', '--jobs', '--depth', '--deepen', '--shallow-since', '--refmap', '-o', '--server-option')),
      operandEffects: [{ prefix: '+', effect: 'rewrites-history' }]
    }
  ],
  ['pull', sub(UPLOAD_PACK, plain('-s', '--strategy', '-X', '--strategy-option', '--depth', '-j', '--jobs'))],
  ['ls-remote', sub(does('runs-program', 'required', '-u', '--upload-pack'), plain('--sort', '-o', '--server-option'))],
  [
    'push',
    sub(
      does('runs-program', 'required', '--receive-pack', '--exec'),
      does('sends-to', 'required', '--repo'),
      plain('-o', '--push-option'),
      optionalPlain('--force-with-lease'),
      flag('-f', '--force', '--force-if-includes', '--mirror', '-d', '--delete', '--prune', '--all', '--tags')
    )
  ],
  [
    'archive',
    sub(
      does('runs-program', 'required', '--exec'),
      does('writes-file', 'required', '-o', '--output'),
      does('reads-file', 'required', '--add-file'),
      plain('--remote', '--prefix', '--format', '--add-virtual-file')
    )
  ],
  [
    'blame',
    sub(
      { ...does('reads-file', 'required', '--contents'), stdio: true },
      does('reads-file', 'required', '--ignore-revs-file', '-S'),
      plain('-L', '--ignore-rev', '--date', '--since', '--until', '--encoding'),
      optionalPlain('-C', '-M', '--abbrev')
    )
  ],
  ['rebase', sub(does('runs-program', 'required', '-x', '--exec'), plain('--onto', '-s', '--strategy', '-X', '--strategy-option'))],
  ['grep', sub(does('runs-program', 'optional', '-O', '--open-files-in-pager'), does('reads-file', 'required', '-f'), plain('-e', '-A', '-B', '-C', '--context', '-m', '--max-count', '--max-depth', '--threads'))],
  ['difftool', sub(does('runs-program', 'required', '-x', '--extcmd'), plain('-t', '--tool'), DIFF)],
  [
    'filter-branch',
    sub(
      does('runs-program', 'required', '--setup', '--env-filter', '--tree-filter', '--index-filter', '--parent-filter', '--msg-filter'),
      does('runs-program', 'required', '--commit-filter', '--tag-name-filter'),
      // `-d` is the temporary dir filter-branch rewrites in.
      does('writes-file', 'required', '-d'),
      plain('--subdirectory-filter', '--original'),
      flag('--prune-empty')
    )
  ],
  [
    'send-email',
    sub(
      does('runs-program', 'required', '--to-cmd', '--cc-cmd', '--header-cmd', '--sendmail-cmd'),
      // An absolute `--smtp-server` is a sendmail-like program it runs.
      { names: ['--smtp-server'], value: 'required', effect: 'runs-program', when: /^\// },
      plain('--to', '--cc', '--bcc', '--from', '--subject', '--in-reply-to')
    )
  ],
  ['diff', sub(DIFF)],
  ['log', sub(DIFF)],
  ['show', sub(DIFF)],
  ['whatchanged', sub(DIFF)],
  [
    'format-patch',
    sub(
      DIFF,
      does('writes-file', 'required', '-o', '--output-directory'),
      does('reads-file', 'required', '--signature-file', '--description-file'),
      plain('--in-reply-to', '--to', '--cc', '--subject-prefix', '--signature', '--suffix', '--start-number', '-v', '--reroll-count', '--base'),
      plain('--interdiff', '--range-diff', '--creation-factor', '--add-header', '--filename-max-length', '--cover-from-description'),
      optionalPlain('--from', '--attach', '--inline', '--thread', '--rfc')
    )
  ],
  ['commit', sub(MESSAGE, PATHSPEC_FILE, REWRITES('--amend'), does('reads-file', 'required', '-t', '--template'), plain('-C', '--reuse-message', '-c', '--reedit-message', '--author', '--date', '--fixup', '--squash'))],
  ['tag', sub(MESSAGE, REWRITES('-d', '--delete', '-f', '--force'), plain('-u', '--local-user'))],
  ['reflog', { ...sub(), operandEffects: [{ first: 'expire', effect: 'rewrites-history' }, { first: 'delete', effect: 'rewrites-history' }] }],
  ['merge', sub(MESSAGE, plain('-s', '--strategy', '-X', '--strategy-option'))],
  ['notes', sub(MESSAGE, plain('-C', '--reuse-message', '-c', '--reedit-message', '--ref'))],
  ['add', sub(PATHSPEC_FILE, plain('--chmod'), flag('-f', '--force'))],
  ['checkout', sub(PATHSPEC_FILE, plain('-b', '-B', '--orphan'))],
  ['switch', sub(plain('-c', '--create', '-C', '--force-create', '--orphan'))],
  ['reset', sub(PATHSPEC_FILE, flag('--hard', '--soft', '--mixed', '--keep', '--merge'))],
  ['clean', sub(flag('-f', '--force', '-d', '-x', '-X', '-n', '--dry-run'), plain('-e', '--exclude'))],
  ['restore', sub(PATHSPEC_FILE, plain('-s', '--source'))],
  ['rm', sub(PATHSPEC_FILE)],
  ['stash', sub(PATHSPEC_FILE, plain('-m', '--message'))],
  ['remote', sub(plain('-t', '-m'))],
  [
    'config',
    sub(
      // The file it reads for a lookup and writes for an edit, which `git config` adds.
      does('reads-file', 'required', '-f', '--file'),
      plain('--blob', '--type', '--default'),
      flag('--get', '--get-all', '--get-regexp', '--get-urlmatch', '-l', '--list', '--show-origin', '--global', '--system', '--local'),
      flag('--add', '--unset', '--unset-all', '--replace-all', '--rename-section', '--remove-section', '-e', '--edit')
    )
  ],
  ['status', sub()],
  ['cherry-pick', sub(flag('-x', '-n', '--no-commit', '-e', '--edit', '-s', '--signoff', '--ff'), plain('-m', '--mainline', '--strategy', '-X', '--strategy-option', '--cleanup', '--empty'))],
  ['revert', sub(flag('-n', '--no-commit', '-e', '--edit', '-s', '--signoff'), plain('-m', '--mainline', '--strategy', '-X', '--strategy-option', '--cleanup'))],
  ['bisect', sub(plain('--term-old', '--term-new', '--term-bad', '--term-good'))],
  ['submodule', sub(does('reads-file', 'required', '--reference'), plain('--depth', '-b', '--branch', '--name', '-j', '--jobs'))],
  [
    'branch',
    sub(
      REWRITES('-d', '--delete', '-D', '-f', '--force', '-M', '-C'),
      flag('-m', '--move', '-c', '--copy'),
      plain('-u', '--set-upstream-to', '--format', '--sort', '--contains', '--no-contains', '--merged', '--no-merged', '--points-at')
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
    movesTo('last-wins', '--prefix', '-C', '--dir', '--cwd')
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
        movesTo('last-wins', '--cwd')
      ]
    }
  ]
]);

/** The whole value is a shell command the program runs (`tar --to-command`, ssh's `ProxyCommand`). */
const WHOLE = /^([\s\S]*)$/;
const runsShell = (value: OptionSpec['value'], ...names: string[]): OptionSpec => ({ names, value, effect: 'runs-program', shell: WHOLE });

/** GNU-style file tools: long options may be abbreviated, and options may follow operands. */
const tool = (...options: (OptionSpec | OptionSpec[])[]): ProgramSpec => sub(...options);

/**
 * The file readers: each operand is a file they read. Their options that take
 * a value are listed, so the value is not read as a file, and the ones that
 * name a file say so.
 */
export const READERS: ReadonlyMap<string, ProgramSpec> = new Map([
  // A flag read as an option that takes a value would hide the file after it, so only documented values are listed.
  ...['cat', 'more'].map((n) => [n, tool()] as const),
  ['nl', tool(plain('-b', '-d', '-f', '-h', '-i', '-l', '-n', '-s', '-v', '-w'))],
  ['strings', tool(plain('-n', '--bytes', '-t', '--radix', '-e', '--encoding', '-T', '--target'))],
  ['cmp', tool(plain('-i', '--ignore-initial', '-n', '--bytes'))],
  ['less', tool(does('writes-file', 'required', '-o', '-O', '--log-file', '--LOG-FILE'), does('reads-file', 'required', '-k', '--lesskey-file', '-T', '--tag-file'), plain('-b', '-h', '-j', '-p', '-t', '-x', '-y', '-z', '-P'))],
  [
    'bat',
    tool(
      does('runs-program', 'required', '--pager'),
      plain('-l', '--language', '--theme', '--style', '-r', '--line-range', '-H', '--highlight-line', '--map-syntax', '--tabs', '--wrap', '--color', '--paging'),
      plain('--terminal-width', '--decorations', '--italic-text', '--file-name')
    )
  ],
  ['wc', tool(does('reads-file', 'required', '--files0-from'))],
  ['file', tool(does('reads-file', 'required', '-f', '--files-from', '-m', '--magic-file'), plain('-F', '--separator', '-P', '--parameter', '-e', '--exclude'))],
  ['stat', tool(plain('-c', '--format', '--printf'))],
  ['diff', tool(does('reads-file', 'required', '--from-file', '--to-file', '-X', '--exclude-from'), plain('-x', '--exclude', '-I', '--ignore-matching-lines', '-U', '-C', '--label', '-L', '-W', '--width', '-F', '--show-function-line', '--line-format', '--old-line-format', '--new-line-format', '--unchanged-line-format', '--old-group-format', '--new-group-format', '--changed-group-format', '--unchanged-group-format', '--tabsize', '--horizon-lines', '--palette', '-S', '--starting-file'), optionalPlain('--color'))],
  ['head', tool(plain('-n', '--lines', '-c', '--bytes'))],
  ['tail', tool(plain('-n', '--lines', '-c', '--bytes', '-b', '-s', '--sleep-interval', '--pid', '--max-unchanged-stats'))],
  ['uniq', tool(plain('-f', '--skip-fields', '-s', '--skip-chars', '-w', '--check-chars'), optionalPlain('--group', '--all-repeated'))],
  ['base64', tool(does('reads-file', 'required', '-i', '--input'), does('writes-file', 'required', '-o', '--output'), plain('-b', '--break', '-w', '--wrap'))],
  ['xxd', tool(plain('-c', '-cols', '-g', '-groupsize', '-l', '-len', '-s', '-seek', '-o', '-offset', '-n', '-name'))],
  ['od', tool(plain('-A', '--address-radix', '-j', '--skip-bytes', '-N', '--read-bytes', '-t', '--format', '-S'), optionalPlain('-w', '--width', '--strings'))],
  ['hexdump', tool(does('reads-file', 'required', '-f'), plain('-e', '-n', '-s'))]
]);

/** Readers whose operand at this index is a file they write (`uniq in out`, `xxd in out`). */
export const READER_OUTPUT: ReadonlyMap<string, number> = new Map([
  ['uniq', 1],
  ['xxd', 1]
]);

/**
 * `touch`, `mkdir`, `mkfifo`, `truncate`: each operand is a file they create
 * or change. A letter means something else in each one (`touch -m` is a flag,
 * `mkdir -m` takes a mode), so each has its own options, from GNU's and BSD's.
 */
export const MAKERS: ReadonlyMap<string, ProgramSpec> = new Map([
  ['touch', tool(does('reads-file', 'required', '-r', '--reference'), plain('-A', '-d', '--date', '-t', '--time'), flag('-a', '-c', '--no-create', '-f', '-h', '--no-dereference', '-m'))],
  ['mkdir', tool(plain('-m', '--mode'), flag('-p', '--parents', '-v', '--verbose', '-Z'), optionalPlain('--context'))],
  ['mkfifo', tool(plain('-m', '--mode'), flag('-Z'), optionalPlain('--context'))],
  ['truncate', tool(does('reads-file', 'required', '-r', '--reference'), plain('-s', '--size'), flag('-c', '--no-create', '-o', '--io-blocks'))]
]);

/** `tree`: its operands are dirs it reads; `-o` writes its listing. */
export const TREE = tool(does('writes-file', 'required', '-o'), plain('-L', '-P', '-I', '-H', '-T', '--charset', '--filelimit', '--timefmt', '--sort'));

/** `tee file…`: each operand is a file it writes. */
export const TEE = tool(flag('-a', '--append', '-i', '--ignore-interrupts', '-p'), optionalPlain('--output-error'));

/** `sed`: a script from `-e`, `-f` or the first operand; `-i` edits the operands in place. */
export const SED = tool(
  plain('-e', '--expression', '-l', '--line-length'),
  does('reads-file', 'required', '-f', '--file'),
  optionalPlain('-i', '--in-place'),
  flag('-E', '-r', '--regexp-extended', '-n', '--quiet', '--silent', '-s', '--separate', '-u', '--unbuffered', '-z', '--null-data', '--posix', '--debug', '--sandbox', '--follow-symlinks')
);

/** grep and its kin: a pattern from `-e`, `-f` or the first operand, then the files they read. */
export const GREP = tool(
  // grep's -r, -E and -T are flags, so rg's value options of those letters are read as flags too: their value is then read as a file.
  plain('-e', '--regexp', '-m', '--max-count', '-A', '--after-context', '-B', '--before-context', '-C', '--context', '-g', '--glob', '-t', '--type', '--type-not', '-d', '--directories', '-D', '--devices'),
  plain('--include', '--exclude', '--exclude-dir', '--label', '--binary-files', '--threads', '--max-columns', '--max-depth', '--encoding', '--replace', '--sort', '--sortr', '--type-add', '--context-separator', '--field-match-separator'),
  optionalPlain('--color', '--colour'),
  does('reads-file', 'required', '-f', '--file', '--exclude-from', '--ignore-file'),
  runsShell('required', '--pre')
);

/** awk: a program from `-f`/`-E` files or the first operand; gawk's `-i` adds a source file, `-i inplace` edits in place, and `-l` loads native code. */
export const AWK = tool(
  does('reads-file', 'required', '-f', '--file', '-E', '--exec'),
  { names: ['-i', '--include'], value: 'required', effect: 'reads-file', when: /^(?!inplace$)/ },
  does('runs-program', 'required', '-l', '--load'),
  plain('-e', '--source', '-v', '--assign', '-F', '--field-separator')
);

/** `rm` and its kin: every option is a flag, and each operand is a path they delete. */
export const REMOVERS = tool(flag('-r', '-R', '--recursive', '-f', '--force', '-i', '-I', '-d', '--dir', '-v', '--verbose', '--no-preserve-root', '--preserve-root', '--one-file-system'));

/** `cp`, `mv`, `install`, `ln`: sources and a destination, or a `-t` dir. */
export const COPIERS = tool(
  does('writes-file', 'required', '-t', '--target-directory'),
  // install's `--strip-program` is a program it runs on each file.
  does('runs-program', 'required', '--strip-program'),
  plain('-S', '--suffix', '-m', '--mode', '-o', '--owner', '-g', '--group'),
  optionalPlain('--backup', '--preserve', '--no-preserve', '--sparse', '--reflink', '--update', '--context')
);

/**
 * `chmod`, `chown`, `chgrp`: a mode or owner, then the files they change. A
 * mode may start with `-` (`chmod -w f`), so a dash word is an option only
 * when every letter in it is one.
 */
export const CHANGERS: ProgramSpec = {
  ...tool(flag('-R', '--recursive', '-v', '--verbose', '-c', '--changes', '-f', '--silent', '--quiet', '-h', '--no-dereference', '-H', '-L', '-P', '--dereference'), does('reads-file', 'required', '--reference'), plain('--from')),
  strictShort: true
};

/** `cd`/`pushd [-L|-P] [-e] [-@] [dir]`. */
export const CD = builtin(flag('-L', '-P', '-e', '-@'));

/** `defaults [-currentHost | -host name | -container name] action …`. */
export const DEFAULTS: ProgramSpec = { abbreviations: false, stopAtOperand: true, singleDash: true, options: [flag('-currentHost'), plain('-host', '-container')] };

/**
 * xargs, with GNU's and BSD's options. Its options stop at the command: `-I`
 * and `-i` put each input line in place of a string, BSD's `-J` puts every
 * item at one word, `-0` and `-d` split on another delimiter, and `-a` reads
 * the items from a file.
 */
export const XARGS: ProgramSpec = {
  ...sub(
    plain('-I', '-J', '-n', '--max-args', '-L', '-P', '--max-procs', '-s', '--max-chars', '-E', '-d', '--delimiter', '-R', '-S', '--process-slot-var'),
    optionalPlain('-i', '--replace', '-e', '--eof', '-l', '--max-lines'),
    does('reads-file', 'required', '-a', '--arg-file'),
    flag('-0', '--null', '-o', '--open-tty', '-p', '--interactive', '-r', '--no-run-if-empty', '-t', '--verbose', '-x', '--exit', '--show-limits')
  ),
  stopAtOperand: true
};

/** `env [-i] [-u name] [-C dir] [-S string] [-0] [-v] [name=value …] [command …]`. */
export const ENV: ProgramSpec = {
  ...sub(
    flag('-i', '--ignore-environment', '-0', '--null', '-v', '--debug'),
    plain('-u', '--unset'),
    movesTo('last-wins', '-C', '--chdir'),
    does('runs-program', 'required', '-S', '--split-string'),
    optionalPlain('--default-signal', '--ignore-signal', '--block-signal')
  ),
  stopAtOperand: true
};

/** A file option whose value `-` is stdin or stdout. */
const stdio = (spec: OptionSpec): OptionSpec => ({ ...spec, stdio: true });

/** A curl option whose value names a file it reads only in some forms of the value. */
const readsIn = (files: FileForm, ...names: string[]): OptionSpec => ({ names, value: 'required', effect: 'reads-file', files });

/**
 * curl's options that take a value, and the files they read and write. curl
 * reads options by their exact name. A value names a file in the form curl's
 * own parser reads for that option (`curl-forms.ts`): `@file` in `-d` and its
 * kin, `-H` and `-w`, `name@file` in `--data-urlencode`, `--url-query` and
 * `--variable`, and a form's files and header files in `-F`.
 */
export const CURL: ProgramSpec = {
  abbreviations: false,
  stopAtOperand: false,
  options: [
    readsIn(AT_FILE, '-d', '--data', '--data-binary', '--data-ascii', '--json', '-H', '--header', '-w', '--write-out'),
    readsIn(NAME_AT_FILE, '--data-urlencode', '--url-query'),
    readsIn(VARIABLE_FILE, '--variable'),
    readsIn(FORM_FILES, '-F', '--form'),
    { names: ['-w', '--write-out'], value: 'required', effect: 'writes-file', files: WRITE_OUT_FILES },
    plain('--data-raw', '--form-string', '--url'),
    // `-T -` and `-T .` upload stdin.
    { names: ['-T', '--upload-file'], value: 'required', effect: 'reads-file', when: /^(?!-$|\.$)/ },
    stdio(does('reads-file', 'required', '-K', '--config')),
    stdio(does('writes-file', 'required', '-o', '--output', '-c', '--cookie-jar', '-D', '--dump-header', '--trace', '--trace-ascii', '--stderr', '--libcurl', '--etag-save', '--hsts', '--alt-svc')),
    does('writes-file', 'required', '--output-dir'),
    does('reads-file', 'required', '--netrc-file', '--etag-compare', '-E', '--cert', '--key', '--cacert', '--capath'),
    // A `-b` value with no `=` names a cookie file.
    { names: ['-b', '--cookie'], value: 'required', effect: 'reads-file', when: /^[^=]*$/ },
    plain('-Q', '--quote', '-t', '--telnet-option', '-P', '--ftp-port', '--unix-socket', '--noproxy', '--mail-from', '--mail-rcpt', '--cert-type', '--key-type', '--ciphers', '--pass', '--aws-sigv4'),
    plain('-X', '--request', '-u', '--user', '-A', '--user-agent', '-e', '--referer', '-r', '--range', '-m', '--max-time', '--connect-timeout', '--retry', '--resolve', '-x', '--proxy'),
    plain('-U', '--proxy-user', '-z', '--time-cond', '-Y', '--speed-limit', '-y', '--speed-time', '-C', '--continue-at', '--limit-rate', '--max-filesize', '--interface', '--dns-servers', '--connect-to', '--oauth2-bearer')
  ]
};

/** wget's options that take a value, and the files they read and write. `--post-file` and `--body-file` are uploads, which `wget` reads itself. */
export const WGET = tool(
  stdio(does('writes-file', 'required', '-O', '--output-document')),
  does('writes-file', 'required', '-o', '--output-file', '-a', '--append-output', '-P', '--directory-prefix', '--save-cookies'),
  stdio(does('reads-file', 'required', '-i', '--input-file')),
  does('reads-file', 'required', '--post-file', '--body-file', '--load-cookies'),
  // `-e` runs a `.wgetrc` command, and `--config` loads a file of them.
  does('runs-program', 'required', '-e', '--execute', '--config'),
  plain('--post-data', '--body-data', '-U', '--user-agent', '--header', '-t', '--tries', '-T', '--timeout', '-w', '--wait', '-Q', '--quota', '-l', '--level', '-A', '--accept'),
  plain('-R', '--reject', '-D', '--domains', '--user', '--password', '--method', '--referer', '--limit-rate')
);

/** tar: the options that run a program or a shell command, and the ones that take a value. */
export const TAR: ProgramSpec = sub(
  runsShell('required', '--to-command', '-I', '--use-compress-program', '--rsh-command', '--rmt-command', '-F', '--info-script', '--new-volume-script'),
  { names: ['--checkpoint-action'], value: 'required', effect: 'runs-program', when: /^exec=/, shell: /^exec=([\s\S]*)$/ },
  does('reads-file', 'required', '-T', '--files-from', '-X', '--exclude-from'),
  movesTo('cumulative', '-C', '--directory'),
  flag('-c', '--create', '-r', '--append', '-u', '--update', '-A', '--catenate', '--concatenate', '--delete', '-x', '--extract', '--get', '-t', '--list', '-d', '--diff', '--compare'),
  // The archive: read, and written too in a mode that writes it, which `tar` adds.
  stdio(does('reads-file', 'required', '-f', '--file')),
  does('writes-file', 'required', '--index-file', '-g', '--listed-incremental'),
  plain('-b', '--blocking-factor', '-H', '--format', '-K', '-N', '-L', '-V', '--exclude', '--transform', '--owner', '--group', '--mode', '--mtime'),
  optionalPlain('--checkpoint')
);

/** zip: `-TT` names the command that tests the archive; zip runs it through a shell. */
export const ZIP: ProgramSpec = sub(
  runsShell('required', '-TT', '--unzip-command'),
  does('writes-file', 'required', '-O', '--output-file'),
  flag('-@', '--names-stdin'),
  does('writes-file', 'required', '-b', '--temp-path'),
  plain('-n', '--suffixes', '-P', '--password', '-t', '--from-date', '-tt', '--before-date', '-Z', '--compression-method')
);

/** sort: `--compress-program` names a program sort runs; `-o` writes a file. */
export const SORT: ProgramSpec = sub(
  does('runs-program', 'required', '--compress-program'),
  does('writes-file', 'required', '-o', '--output', '-T', '--temporary-directory'),
  does('reads-file', 'required', '--files0-from', '--random-source'),
  plain('-k', '--key', '-t', '--field-separator', '-S', '--buffer-size', '--parallel', '--batch-size')
);

/** ssh's `-o` keys whose value is a command ssh runs on this machine through a shell. */
// OpenSSH ends a key at whitespace or one `=` (with whitespace around it), in any case.
const SSH_COMMAND_KEYS = /^\s*(ProxyCommand|LocalCommand|KnownHostsCommand)(?:\s*=|\s)/i;
const SSH_OPTION: OptionSpec = {
  names: ['-o'],
  value: 'required',
  effect: 'runs-program',
  when: SSH_COMMAND_KEYS,
  shell: /^\s*(?:ProxyCommand|LocalCommand|KnownHostsCommand)(?:\s*=\s*|\s+)([\s\S]*)$/i
};

/** ssh: `-o ProxyCommand=…` runs a command here, `-F` loads a config file, `-i` reads a key. */
export const SSH: ProgramSpec = {
  abbreviations: false,
  stopAtOperand: true,
  options: [
    SSH_OPTION,
    does('reads-file', 'required', '-i', '-F'),
    does('writes-file', 'required', '-E'),
    // `-I` loads a PKCS#11 library, which is native code.
    does('runs-program', 'required', '-I'),
    // `-S` names a control socket, which is no file whose text ssh reads or writes.
    plain('-J', '-L', '-R', '-D', '-p', '-l', '-S', '-W', '-b', '-B', '-c', '-e', '-m', '-O', '-P', '-Q', '-w')
  ]
};

/** scp: like ssh, and `-S` names the program it runs in place of ssh. */
export const SCP: ProgramSpec = {
  abbreviations: false,
  stopAtOperand: false,
  // `-S` is the program it runs in place of ssh, and `-D` a local SFTP server it runs.
  options: [SSH_OPTION, does('runs-program', 'required', '-S', '-D'), does('reads-file', 'required', '-i', '-F'), plain('-P', '-c', '-l', '-J', '-X')]
};

/** rsync: `-e`/`--rsh` is the remote shell command, which rsync runs here. */
export const RSYNC: ProgramSpec = sub(
  runsShell('required', '-e', '--rsh'),
  does('reads-file', 'required', '--exclude-from', '--include-from', '--files-from', '--password-file'),
  does('writes-file', 'required', '--log-file', '-T', '--temp-dir', '--backup-dir', '--partial-dir'),
  does('reads-file', 'required', '--compare-dest', '--copy-dest', '--link-dest'),
  plain('-f', '--filter', '--exclude', '--include', '--rsync-path')
);

/** man: `-P` is the pager and `-H` the browser, which man runs through a shell. */
export const MAN: ProgramSpec = sub(
  runsShell('required', '-P', '--pager'),
  runsShell('optional', '-H', '--html'),
  does('reads-file', 'required', '-C', '--config-file'),
  plain('-M', '--manpath', '-S', '-s', '--sections', '-L', '--locale', '-m', '--systems', '-e', '--extension', '-p', '--preprocessor', '-R', '--recode')
);

/** A program that runs text in its own command language, from options, operands and stdin. */
export interface TextProgram {
  readonly spec: ProgramSpec;
  readonly language: CommandLanguage;
  /** Options whose value is text in the language (`psql -c`, `mysql -e`, `sqlite3 -cmd`). */
  readonly textOptions: readonly string[];
  /** Operands from this index on are text in the language (sqlite3's after the database). */
  readonly textFrom?: number;
  /** An operand that starts with `+` is text in the language (vim's `+cmd`). */
  readonly plusText?: boolean;
  /**
   * Whether it reads text from stdin: never (`false`), or unless text in an
   * operand or one of these options makes it run that and exit (`psql -c`,
   * `-f`, gdb's `-batch`). Any of these options whose value is `-` reads
   * stdin, whatever else the command passes (`psql -f - -c …`).
   */
  readonly stdin: false | { readonly unless: readonly string[] };
  /**
   * The specs the program may read its arguments with, when an option's
   * arity depends on the ones before it; each reading is analyzed.
   */
  readonly readings?: (args: readonly Arg[]) => readonly ProgramSpec[];
}

const PSQL: TextProgram = {
  spec: sub(
    // psql opens `-o` as a pipe only when its first character is `|`, and as a file otherwise; `-L` is always a file.
    { names: ['-o', '--output'], value: 'required', effect: 'runs-program', when: /^\|/, shell: /^\|([\s\S]*)$/ },
    { names: ['-o', '--output'], value: 'required', effect: 'writes-file', when: /^(?!\|)/ },
    does('writes-file', 'required', '-L', '--log-file'),
    stdio(does('reads-file', 'required', '-f', '--file')),
    plain('-c', '--command', '-d', '--dbname', '-h', '--host', '-p', '--port', '-U', '--username', '-v', '--set', '--variable'),
    plain('-P', '--pset', '-F', '--field-separator', '-R', '--record-separator', '-T', '--table-attr')
  ),
  language: languages.PSQL,
  textOptions: ['-c', '--command'],
  stdin: { unless: ['-c', '--command', '-f', '--file'] }
};

const SQLITE_FLAGS = ['-bail', '-batch', '-csv', '-json', '-line', '-list', '-html', '-box', '-column', '-markdown', '-table', '-header'];

const SQLITE3: TextProgram = {
  spec: {
    abbreviations: false,
    stopAtOperand: false,
    singleDash: true,
    options: [
      plain('-cmd', '--cmd', '-separator', '-newline', '-nullvalue', '-escape', '-maxsize'),
      does('reads-file', 'required', '-init', '--init'),
      flag(...SQLITE_FLAGS, '-noheader', '-echo', '-interactive', '-readonly', '-safe', '-version', '-help')
    ]
  },
  language: languages.SQLITE,
  textOptions: ['-cmd', '--cmd'],
  textFrom: 1,
  stdin: { unless: [] }
};

const DUCKDB: TextProgram = {
  spec: {
    abbreviations: false,
    stopAtOperand: false,
    singleDash: true,
    options: [plain('-c', '-cmd', '-s', '-separator', '-newline', '-nullvalue'), does('reads-file', 'required', '-f', '-init'), flag(...SQLITE_FLAGS, '-readonly', '-unsigned')]
  },
  language: languages.DUCKDB,
  textOptions: ['-c', '-cmd', '-s'],
  textFrom: 1,
  stdin: { unless: ['-c', '-s', '-f'] }
};

const MYSQL: TextProgram = {
  spec: sub(
    runsShell('optional', '--pager'),
    // A defaults file can set the pager, and a plugin is native code.
    does('runs-program', 'required', '--defaults-file', '--defaults-extra-file', '--plugin-dir', '--default-auth'),
    does('writes-file', 'required', '--tee'),
    plain('-e', '--execute', '-D', '--database', '-h', '--host', '-u', '--user', '-P', '--port', '-S', '--socket', '--init-command'),
    optionalPlain('-p', '--password')
  ),
  language: languages.MYSQL,
  textOptions: ['-e', '--execute'],
  stdin: { unless: ['-e', '--execute'] }
};

const PWSH: TextProgram = {
  spec: {
    abbreviations: true,
    stopAtOperand: true,
    singleDash: true,
    anyCase: true,
    options: [
      plain('-Command', '-c', '-EncodedCommand', '-e', '-ec', '-CommandWithArgs', '-cwa', '-ExecutionPolicy', '-ep'),
      does('reads-file', 'required', '-File', '-f'),
      movesTo('last-wins', '-WorkingDirectory', '-wd'),
      flag('-NoProfile', '-nop', '-NonInteractive', '-NoLogo', '-Version', '-Help', '-Login', '-l')
    ]
  },
  language: languages.OPAQUE,
  textOptions: ['-Command', '-c', '-EncodedCommand', '-e', '-ec', '-CommandWithArgs', '-cwa'],
  stdin: { unless: ['-Command', '-c', '-EncodedCommand', '-e', '-ec', '-CommandWithArgs', '-cwa', '-File', '-f'] }
};

const GDB: TextProgram = {
  spec: {
    abbreviations: true,
    stopAtOperand: false,
    singleDash: true,
    options: [
      plain('-ex', '--ex', '-eval-command', '--eval-command', '-iex', '--iex', '-init-eval-command', '--init-eval-command'),
      // A script file holds gdb commands the analysis does not read.
      does('runs-program', 'required', '-x', '--command', '-command', '-ix', '--init-command', '-init-command'),
      does('reads-file', 'required', '-x', '--command', '-command', '-ix', '--init-command', '-init-command'),
      movesTo('last-wins', '-cd', '--cd'),
      does('reads-file', 'required', '-d', '--directory', '-s', '--symbols', '-c', '--core', '-se', '-e', '--exec'),
      plain('-p', '--pid'),
      flag('-batch', '--batch', '-nx', '--nx', '-n', '-q', '--quiet', '-silent', '--args')
    ]
  },
  language: languages.GDB,
  textOptions: ['-ex', '--ex', '-eval-command', '--eval-command', '-iex', '--iex', '-init-eval-command', '--init-eval-command'],
  stdin: { unless: ['-batch', '--batch'] }
};

const VIM_OPTIONS = [
  plain('-c', '--cmd', '-T'),
  flag('-r', '-e', '-E'),
  does('reads-file', 'required', '-i'),
  does('writes-file', 'required', '-i'),
  does('reads-file', 'optional', '-S'),
  does('reads-file', 'required', '-u', '-U'),
  does('writes-file', 'required', '-w', '-W')
];
/** vim reads `-s file` as a script of keystrokes, but after `-e` or `-E` `-s` is the silent flag. */
const VIM_SPEC = sub(...VIM_OPTIONS, does('reads-file', 'required', '-s'));
const VIM_EX_SPEC = sub(...VIM_OPTIONS, flag('-s'));

/**
 * vim's readings: decided by the first `-s` and whether an `-e` or `-E` came
 * before it; both when a word from a variable before it may be one.
 */
function vimReadings(args: readonly Arg[]): readonly ProgramSpec[] {
  let ex = false;
  let unsure = false;
  for (const arg of args) {
    if (arg.kind === 'unknown') {
      unsure ||= mayBeOption(arg);
      continue;
    }
    if (arg.text === '--') break;
    if (!/^-[A-Za-z]/.test(arg.text)) continue;
    for (const c of arg.text.slice(1)) {
      if (c === 'e' || c === 'E') ex = true;
      else if (c === 's') return ex ? [VIM_EX_SPEC] : unsure ? [VIM_SPEC, VIM_EX_SPEC] : [VIM_SPEC];
      // The rest of the word is this option's value.
      else if ('cTiuUwWS'.includes(c)) break;
    }
  }
  return [VIM_SPEC];
}

const VIM: TextProgram = {
  spec: VIM_SPEC,
  readings: vimReadings,
  language: languages.VIM,
  textOptions: ['-c', '--cmd'],
  plusText: true,
  stdin: false
};

const EXPECT: TextProgram = {
  spec: sub(plain('-c', '-D'), does('reads-file', 'required', '-f', '-b'), flag('-d', '-i', '-n', '-N', '-v')),
  language: languages.OPAQUE,
  textOptions: ['-c'],
  stdin: { unless: ['-c', '-f'] }
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
