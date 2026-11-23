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
  ['fetch', sub(UPLOAD_PACK, value('-j', '--jobs', '--depth', '--deepen', '--shallow-since', '--refmap', '-o', '--server-option'), flag('-u', '--update-head-ok'))],
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
  ['commit', sub(MESSAGE, PATHSPEC_FILE, does('reads-file', 'required', '-t', '--template'), value('-C', '--reuse-message', '-c', '--reedit-message', '--author', '--date', '--fixup', '--squash'))],
  ['tag', sub(MESSAGE, value('-u', '--local-user'))],
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
  ['bisect', sub(value('--term-old', '--term-new', '--term-bad', '--term-good'))],
  ['submodule', sub(value('--reference', '--depth', '-b', '--branch', '--name', '-j', '--jobs'))],
  ['branch', sub(value('-m', '-M', '-c', '-C', '-u', '--set-upstream-to', '--format', '--sort', '--contains', '--merged'))]
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
