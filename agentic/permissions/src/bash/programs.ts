/**
 * The program registry: for each program (and git subcommand) the analysis
 * reads options for, how it reads them and what each option does. The
 * analyzer's rules and the prefix guard both read options through it with
 * `readArgs`/`optionSpecs`, so they cannot disagree on an option. Options with
 * no effect are listed when they take a value, so the value is not read as an
 * operand.
 */

import type { Arg } from './analyze';
import type { CommandLanguage } from './languages';
import * as languages from './languages';
import { type Effect, mayBeOption, type OptionSpec, type ProgramSpec } from './options';

const flag = (...names: string[]): OptionSpec => ({ names, value: 'none' });
const value = (...names: string[]): OptionSpec => ({ names, value: 'required' });
const does = (effect: Effect, value: OptionSpec['value'], ...names: string[]): OptionSpec => ({ names, value, effect });

/** bash's builtins read their options with getopt, up to the first operand. */
const builtin = (...options: OptionSpec[]): ProgramSpec => ({ abbreviations: false, stopAtOperand: true, options });

/** `read [-ers] [-a array] [-d delim] [-i text] [-n|-N n] [-p prompt] [-t timeout] [-u fd] [name …]`. */
export const READ = builtin(value('-a', '-d', '-i', '-n', '-N', '-p', '-t', '-u'), flag('-e', '-r', '-s'));

/** `printf -v name format …`: the builtin's only option. */
export const PRINTF = builtin(value('-v'));

/** `mapfile`/`readarray [-d delim] [-n count] [-O origin] [-s count] [-t] [-u fd] [-C callback] [-c quantum] [array]`; the callback runs as code. */
export const MAPFILE = builtin(value('-d', '-n', '-O', '-s', '-u', '-c'), does('runs-program', 'required', '-C'), flag('-t'));

/** `trap [-lpP] [action] [condition …]`: `-l` and `-p` (and bash 5.3's `-P`) only list. */
export const TRAP = builtin(flag('-l', '-p', '-P'));

/** `unset [-f|-v|-n] name …`: `-f` unsets functions, the others variables. */
export const UNSET = builtin(flag('-f', '-v', '-n'));

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
  ['nl', tool(value('-b', '-d', '-f', '-h', '-i', '-l', '-n', '-s', '-v', '-w'))],
  ['strings', tool(value('-n', '--bytes', '-t', '--radix', '-e', '--encoding', '-T', '--target'))],
  ['cmp', tool(value('-i', '--ignore-initial', '-n', '--bytes'))],
  ['less', tool(does('writes-file', 'required', '-o', '-O', '--log-file', '--LOG-FILE'), does('reads-file', 'required', '-k', '--lesskey-file', '-T', '--tag-file'), value('-b', '-h', '-j', '-p', '-t', '-x', '-y', '-z', '-P'))],
  ['bat', tool(value('-l', '--language', '--theme', '--style', '-r', '--line-range', '-H', '--highlight-line', '--map-syntax', '--tabs', '--wrap', '--color', '--paging', '--pager', '--terminal-width', '--decorations', '--italic-text', '--file-name'))],
  ['wc', tool(does('reads-file', 'required', '--files0-from'))],
  ['file', tool(does('reads-file', 'required', '-f', '--files-from', '-m', '--magic-file'), value('-F', '--separator', '-P', '--parameter', '-e', '--exclude'))],
  ['stat', tool(value('-c', '--format', '--printf'))],
  ['diff', tool(does('reads-file', 'required', '--from-file', '--to-file', '-X', '--exclude-from'), value('-x', '--exclude', '-I', '--ignore-matching-lines', '-U', '-C', '--label', '-L', '-W', '--width', '-F', '--show-function-line', '--line-format', '--old-line-format', '--new-line-format', '--unchanged-line-format', '--old-group-format', '--new-group-format', '--changed-group-format', '--unchanged-group-format', '--tabsize', '--horizon-lines', '--palette', '-S', '--starting-file'), { names: ['--color'], value: 'optional' })],
  ['head', tool(value('-n', '--lines', '-c', '--bytes'))],
  ['tail', tool(value('-n', '--lines', '-c', '--bytes', '-b', '-s', '--sleep-interval', '--pid', '--max-unchanged-stats'))],
  ['uniq', tool(value('-f', '--skip-fields', '-s', '--skip-chars', '-w', '--check-chars'), { names: ['--group', '--all-repeated'], value: 'optional' })],
  ['base64', tool(does('reads-file', 'required', '-i', '--input'), does('writes-file', 'required', '-o', '--output'), value('-b', '--break', '-w', '--wrap'))],
  ['xxd', tool(value('-c', '-cols', '-g', '-groupsize', '-l', '-len', '-s', '-seek', '-o', '-offset', '-n', '-name'))],
  ['od', tool(value('-A', '--address-radix', '-j', '--skip-bytes', '-N', '--read-bytes', '-t', '--format', '-S'), { names: ['-w', '--width', '--strings'], value: 'optional' })],
  ['hexdump', tool(does('reads-file', 'required', '-f'), value('-e', '-n', '-s'))]
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
  ['touch', tool(does('reads-file', 'required', '-r', '--reference'), value('-A', '-d', '--date', '-t', '--time'), flag('-a', '-c', '--no-create', '-f', '-h', '--no-dereference', '-m'))],
  ['mkdir', tool(value('-m', '--mode'), flag('-p', '--parents', '-v', '--verbose', '-Z'), { names: ['--context'], value: 'optional' })],
  ['mkfifo', tool(value('-m', '--mode'), flag('-Z'), { names: ['--context'], value: 'optional' })],
  ['truncate', tool(does('reads-file', 'required', '-r', '--reference'), value('-s', '--size'), flag('-c', '--no-create', '-o', '--io-blocks'))]
]);

/** `tree`: its operands are dirs it reads; `-o` writes its listing. */
export const TREE = tool(does('writes-file', 'required', '-o'), value('-L', '-P', '-I', '-H', '-T', '--charset', '--filelimit', '--timefmt', '--sort'));

/** `tee file…`: each operand is a file it writes. */
export const TEE = tool(flag('-a', '--append', '-i', '--ignore-interrupts', '-p'), { names: ['--output-error'], value: 'optional' });

/** `sed`: a script from `-e`, `-f` or the first operand; `-i` edits the operands in place. */
export const SED = tool(
  value('-e', '--expression', '-l', '--line-length'),
  does('reads-file', 'required', '-f', '--file'),
  { names: ['-i', '--in-place'], value: 'optional' },
  flag('-E', '-r', '--regexp-extended', '-n', '--quiet', '--silent', '-s', '--separate', '-u', '--unbuffered', '-z', '--null-data', '--posix', '--debug', '--sandbox', '--follow-symlinks')
);

/** grep and its kin: a pattern from `-e`, `-f` or the first operand, then the files they read. */
export const GREP = tool(
  // grep's -r, -E and -T are flags, so rg's value options of those letters are read as flags too: their value is then read as a file.
  value('-e', '--regexp', '-m', '--max-count', '-A', '--after-context', '-B', '--before-context', '-C', '--context', '-g', '--glob', '-t', '--type', '--type-not', '-d', '--directories', '-D', '--devices'),
  value('--include', '--exclude', '--exclude-dir', '--label', '--binary-files', '--threads', '--max-columns', '--max-depth', '--encoding', '--replace', '--sort', '--sortr', '--type-add', '--context-separator', '--field-match-separator'),
  { names: ['--color', '--colour'], value: 'optional' },
  does('reads-file', 'required', '-f', '--file', '--exclude-from', '--ignore-file'),
  runsShell('required', '--pre')
);

/** awk: a program from `-f`/`-E` files or the first operand; gawk's `-i` adds a source file, `-i inplace` edits in place, and `-l` loads native code. */
export const AWK = tool(
  does('reads-file', 'required', '-f', '--file', '-E', '--exec'),
  { names: ['-i', '--include'], value: 'required', effect: 'reads-file', when: /^(?!inplace$)/ },
  does('runs-program', 'required', '-l', '--load'),
  value('-e', '--source', '-v', '--assign', '-F', '--field-separator')
);

/** `rm` and its kin: every option is a flag, and each operand is a path they delete. */
export const REMOVERS = tool(flag('-r', '-R', '--recursive', '-f', '--force', '-i', '-I', '-d', '--dir', '-v', '--verbose', '--no-preserve-root', '--preserve-root', '--one-file-system'));

/** `cp`, `mv`, `install`, `ln`: sources and a destination, or a `-t` dir. */
export const COPIERS = tool(
  does('writes-file', 'required', '-t', '--target-directory'),
  value('-S', '--suffix', '-m', '--mode', '-o', '--owner', '-g', '--group', '--strip-program'),
  { names: ['--backup', '--preserve', '--no-preserve', '--sparse', '--reflink', '--update', '--context'], value: 'optional' }
);

/**
 * `chmod`, `chown`, `chgrp`: a mode or owner, then the files they change. A
 * mode may start with `-` (`chmod -w f`), so a dash word is an option only
 * when every letter in it is one.
 */
export const CHANGERS: ProgramSpec = {
  ...tool(flag('-R', '--recursive', '-v', '--verbose', '-c', '--changes', '-f', '--silent', '--quiet', '-h', '--no-dereference', '-H', '-L', '-P', '--dereference'), does('reads-file', 'required', '--reference'), value('--from')),
  strictShort: true
};

/** `cd`/`pushd [-L|-P] [-e] [-@] [dir]`. */
export const CD = builtin(flag('-L', '-P', '-e', '-@'));

/** `defaults [-currentHost | -host name | -container name] action …`. */
export const DEFAULTS: ProgramSpec = { abbreviations: false, stopAtOperand: true, singleDash: true, options: [flag('-currentHost'), value('-host', '-container')] };

/**
 * xargs, with GNU's and BSD's options. Its options stop at the command: `-I`
 * and `-i` put each input line in place of a string, BSD's `-J` puts every
 * item at one word, `-0` and `-d` split on another delimiter, and `-a` reads
 * the items from a file.
 */
export const XARGS: ProgramSpec = {
  ...sub(
    value('-I', '-J', '-n', '--max-args', '-L', '-P', '--max-procs', '-s', '--max-chars', '-E', '-d', '--delimiter', '-R', '-S', '--process-slot-var'),
    { names: ['-i', '--replace', '-e', '--eof', '-l', '--max-lines'], value: 'optional' },
    does('reads-file', 'required', '-a', '--arg-file'),
    flag('-0', '--null', '-o', '--open-tty', '-p', '--interactive', '-r', '--no-run-if-empty', '-t', '--verbose', '-x', '--exit', '--show-limits')
  ),
  stopAtOperand: true
};

/** `env [-i] [-u name] [-C dir] [-S string] [-0] [-v] [name=value …] [command …]`. */
export const ENV: ProgramSpec = {
  ...sub(
    flag('-i', '--ignore-environment', '-0', '--null', '-v', '--debug'),
    value('-u', '--unset'),
    does('changes-dir', 'required', '-C', '--chdir'),
    does('runs-program', 'required', '-S', '--split-string'),
    { names: ['--default-signal', '--ignore-signal', '--block-signal'], value: 'optional' }
  ),
  stopAtOperand: true
};

/** A file option whose value `-` is stdin or stdout. */
const stdio = (spec: OptionSpec): OptionSpec => ({ ...spec, stdio: true });

/**
 * curl's options that take a value, and the files they read and write. curl
 * reads options by their exact name. The data forms (`-d @file`, `-F
 * name=@file`, `-H @file`) and `-T` are uploads, which `curl` reads itself.
 */
export const CURL: ProgramSpec = {
  abbreviations: false,
  stopAtOperand: false,
  options: [
    value('-d', '--data', '--data-binary', '--data-raw', '--data-ascii', '--data-urlencode', '--json', '-F', '--form', '--form-string', '-H', '--header', '--url'),
    // `-T -` and `-T .` upload stdin.
    { names: ['-T', '--upload-file'], value: 'required', effect: 'reads-file', when: /^(?!-$|\.$)/ },
    stdio(does('reads-file', 'required', '-K', '--config')),
    stdio(does('writes-file', 'required', '-o', '--output', '-c', '--cookie-jar', '-D', '--dump-header', '--trace', '--trace-ascii', '--stderr', '--libcurl', '--etag-save', '--hsts', '--alt-svc')),
    does('writes-file', 'required', '--output-dir'),
    does('reads-file', 'required', '--netrc-file', '--etag-compare', '-E', '--cert', '--key', '--cacert', '--capath'),
    // A `-b` value with no `=` names a cookie file.
    { names: ['-b', '--cookie'], value: 'required', effect: 'reads-file', when: /^[^=]*$/ },
    value('-Q', '--quote', '-t', '--telnet-option', '-P', '--ftp-port', '--unix-socket', '--noproxy', '--mail-from', '--mail-rcpt', '--cert-type', '--key-type', '--ciphers', '--pass', '--aws-sigv4', '--variable'),
    value('-X', '--request', '-u', '--user', '-A', '--user-agent', '-e', '--referer', '-r', '--range', '-m', '--max-time', '--connect-timeout', '--retry', '--resolve', '-w', '--write-out', '-x', '--proxy', '-U', '--proxy-user', '-z', '--time-cond', '-Y', '--speed-limit', '-y', '--speed-time', '-C', '--continue-at', '--limit-rate', '--max-filesize', '--interface', '--dns-servers', '--connect-to', '--oauth2-bearer')
  ]
};

/** wget's options that take a value, and the files they read and write. `--post-file` and `--body-file` are uploads, which `wget` reads itself. */
export const WGET = tool(
  stdio(does('writes-file', 'required', '-O', '--output-document')),
  does('writes-file', 'required', '-o', '--output-file', '-a', '--append-output', '-P', '--directory-prefix', '--save-cookies'),
  stdio(does('reads-file', 'required', '-i', '--input-file')),
  does('reads-file', 'required', '--post-file', '--body-file', '--load-cookies'),
  value('--post-data', '--body-data', '-U', '--user-agent', '--header', '-t', '--tries', '-T', '--timeout', '-w', '--wait', '-Q', '--quota', '-l', '--level', '-A', '--accept', '-R', '--reject', '-D', '--domains', '-e', '--execute'),
  value('--user', '--password', '--method', '--referer', '--limit-rate')
);

/** tar: the options that run a program or a shell command, and the ones that take a value. */
export const TAR: ProgramSpec = sub(
  runsShell('required', '--to-command', '-I', '--use-compress-program', '--rsh-command', '--rmt-command', '-F', '--info-script', '--new-volume-script'),
  { names: ['--checkpoint-action'], value: 'required', effect: 'runs-program', when: /^exec=/, shell: /^exec=([\s\S]*)$/ },
  does('reads-file', 'required', '-T', '--files-from', '-X', '--exclude-from'),
  does('changes-dir', 'required', '-C', '--directory'),
  flag('-c', '--create', '-r', '--append', '-u', '--update', '-A', '--catenate', '--concatenate', '--delete', '-x', '--extract', '--get', '-t', '--list', '-d', '--diff', '--compare'),
  value('-f', '--file', '-b', '--blocking-factor', '-H', '--format', '-K', '-N', '-L', '-V', '--exclude', '--transform', '--owner', '--group', '--mode', '--mtime'),
  { names: ['--checkpoint'], value: 'optional' }
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
    value('-J', '-L', '-R', '-D', '-p', '-l', '-S', '-W', '-b', '-B', '-c', '-e', '-I', '-m', '-O', '-P', '-Q', '-w')
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
    value('-c', '--command', '-d', '--dbname', '-h', '--host', '-p', '--port', '-U', '--username', '-v', '--set', '--variable'),
    value('-P', '--pset', '-F', '--field-separator', '-R', '--record-separator', '-T', '--table-attr')
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
      value('-cmd', '--cmd', '-separator', '-newline', '-nullvalue', '-escape', '-maxsize'),
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
    options: [value('-c', '-cmd', '-s', '-separator', '-newline', '-nullvalue'), does('reads-file', 'required', '-f', '-init'), flag(...SQLITE_FLAGS, '-readonly', '-unsigned')]
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
    value('-e', '--execute', '-D', '--database', '-h', '--host', '-u', '--user', '-P', '--port', '-S', '--socket', '--init-command'),
    { names: ['-p', '--password'], value: 'optional' }
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
      value('-Command', '-c', '-EncodedCommand', '-e', '-ec', '-CommandWithArgs', '-cwa', '-ExecutionPolicy', '-ep'),
      does('reads-file', 'required', '-File', '-f'),
      does('changes-dir', 'required', '-WorkingDirectory', '-wd'),
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
      value('-ex', '--ex', '-eval-command', '--eval-command', '-iex', '--iex', '-init-eval-command', '--init-eval-command'),
      // A script file holds gdb commands the analysis does not read.
      does('runs-program', 'required', '-x', '--command', '-command', '-ix', '--init-command', '-init-command'),
      does('reads-file', 'required', '-x', '--command', '-command', '-ix', '--init-command', '-init-command'),
      does('changes-dir', 'required', '-cd', '--cd'),
      value('-p', '--pid', '-d', '--directory', '-s', '--symbols', '-c', '--core', '-se', '-e', '--exec'),
      flag('-batch', '--batch', '-nx', '--nx', '-n', '-q', '--quiet', '-silent', '--args')
    ]
  },
  language: languages.GDB,
  textOptions: ['-ex', '--ex', '-eval-command', '--eval-command', '-iex', '--iex', '-init-eval-command', '--init-eval-command'],
  stdin: { unless: ['-batch', '--batch'] }
};

const VIM_OPTIONS = [
  value('-c', '--cmd', '-T'),
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
  spec: sub(value('-c', '-D'), does('reads-file', 'required', '-f', '-b'), flag('-d', '-i', '-n', '-N', '-v')),
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
