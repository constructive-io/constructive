/**
 * git: options that make it run programs, pushes that rewrite or leave for an
 * unknown remote, config writes, and force-adding a secret file. Options are
 * read through the program registry (`GIT`, `gitSubcommand`), so every
 * spelling git accepts counts: clusters, abbreviations, `=` and next-word
 * values.
 */

import { isSecretFile } from '../secret-files';
import { type Arg, type Cwd, literalStart } from './analyze';
import { type CommandContext, generic, literalArg, textOf } from './args';
import { hasOption, isOption, lastValueOf, type ReadArgs, readArgs, withEffect } from './options';
import { GIT, gitSubcommand } from './programs';
import { applyEffects, dirSpecOf, movedBy } from './scripts';
import { isRemoteSpec, isUrl } from './words';

/** `git -c` keys that make git run a program. */
const GIT_EXEC_CONFIG =
  /^(alias\.|core\.(sshcommand|pager|editor|fsmonitor|hookspath|askpass|gitproxy)|diff\.|credential\.|sequence\.editor|gpg\.|filter\.|uploadpack\.|protocol\.|include\.|includeif\.|remote\..*\.(uploadpack|receivepack))/i;

/** Subcommands whose action word runs the command after it: `git bisect run`, `git submodule foreach`. */
const RUNS_COMMAND: ReadonlyMap<string, string> = new Map([
  ['bisect', 'run'],
  ['submodule', 'foreach']
]);

/** Stands for every remote when the command repoints one whose name comes from a variable. */
const ANY_REMOTE = '\u0000any';

/** `git -c remote.<name>.url=…`: the remote points somewhere else for this run. */
const GIT_REMOTE_URL_CONFIG = /^remote\.(.+)\.(url|pushurl)=/i;

/** A `key=value` git config option: a key that runs a program, or one from a variable, which may be such a key. */
function configKey(ctx: CommandContext, spelling: string, kv: Arg | undefined): void {
  if (kv?.kind === 'unknown') ctx.analyzer.dynamic(`${spelling} ${kv.raw} takes a config key from a variable, which may make git run a program`);
  else if (kv && GIT_EXEC_CONFIG.test(kv.text)) ctx.analyzer.dynamic(`${spelling} ${kv.text} makes git run a program`);
}

/** The subcommand's config options: a key that runs a program, or one from a variable, which may be such a key. */
function configOptions(ctx: CommandContext, sub: string | undefined, read: ReadArgs): void {
  for (const option of withEffect(read, 'sets-config')) configKey(ctx, `git ${sub} ${option.name}`, option.value);
}

/** `git bisect run`, `git submodule foreach`: the action word, known or from a variable, runs the command after it. */
function runsCommand(ctx: CommandContext, sub: string | undefined, read: ReadArgs): void {
  const action = sub === undefined ? undefined : RUNS_COMMAND.get(sub);
  if (!action) return;
  const word = read.positionals[0];
  if (word?.kind === 'unknown') return ctx.analyzer.dynamic(`it passes git ${sub} ${word.raw}, a value from a variable that may be \`${action}\``);
  if (textOf(word) === action) ctx.analyzer.dynamic(`it runs git ${sub} ${action}, which runs the command after it`);
}

/**
 * `git push`: destructive when it rewrites or deletes refs, and an upload when
 * it goes to a URL or to a remote this command added or repointed.
 */
function push(ctx: CommandContext, read: ReadArgs): void {
  const { analyzer } = ctx;
  const force =
    hasOption(read, '-f', '--force', '--force-if-includes', '--force-with-lease', '--mirror', '-d', '--delete', '--prune') ||
    read.operands.some((a) => literalStart(a).startsWith('+') || literalStart(a).startsWith(':'));
  if (force) analyzer.flag('destructive', 'it force-pushes or deletes refs on the remote');
  // git keeps the last --repo, and a repository operand wins over it.
  const remote = read.positionals[0] ?? lastValueOf(read, '--repo');
  if (!remote) {
    if (analyzer.gitRemotes.size > 0) analyzer.flag('upload', 'it uploads data: git push goes to a remote this command changed');
    return;
  }
  if (remote.kind === 'unknown' || isUrl(remote.text) || isRemoteSpec(remote.text)) {
    analyzer.flag('upload', `it uploads data: git push sends commits to ${remote.raw}`);
  } else if (analyzer.gitRemotes.has(remote.text) || analyzer.gitRemotes.has(ANY_REMOTE)) {
    analyzer.flag('upload', `it uploads data: git push goes to ${remote.raw}, a remote this command set`);
  }
}

/** `git remote add|set-url NAME URL`: remember the name, so a later push is an upload. */
function remote(ctx: CommandContext, read: ReadArgs): void {
  const [action, name] = read.positionals;
  if ((textOf(action) === 'add' || textOf(action) === 'set-url') && name) ctx.analyzer.gitRemotes.add(textOf(name) ?? ANY_REMOTE);
}

/** `git add -f .env`: stages a file `.gitignore` keeps out, so its values would be committed. */
function add(ctx: CommandContext, read: ReadArgs): void {
  if (hasOption(read, '-f', '--force')) {
    for (const op of read.positionals) {
      if (op.kind === 'unknown') {
        ctx.analyzer.flag('secret-into-plain-file', `git add -f stages ${op.raw}, a file named by a variable, which may be a secret file`);
        continue;
      }
      if (!isSecretFile(op.text)) continue;
      ctx.analyzer.flag('secret-file', `git add -f stages the secret file ${op.raw}, which .gitignore keeps out of the repo`);
      ctx.analyzer.flag('secret-into-plain-file', `git add -f puts ${op.raw} into the repo, where its values are committed in the clear`);
    }
  }
}

/** `git config`: a write to the file it edits, unless it only reads. */
function config(ctx: CommandContext, read: ReadArgs, here: Arg, raw: string): void {
  const { analyzer } = ctx;
  // `git config get|list …` (git 2.46) reads; `set`, `unset`, `rename-section`, … edit.
  const action = textOf(read.operands[0]);
  const reads = hasOption(read, '--get', '--get-all', '--get-regexp', '--get-urlmatch', '--list', '-l', '--show-origin') || action === 'get' || action === 'list';
  const edits = hasOption(read, '--add', '--unset', '--unset-all', '--replace-all', '--rename-section', '--remove-section', '-e', '--edit');
  const writes = !reads && (edits || read.operands.length >= 2 || read.unknown.length > 0);
  // The registry reads the file; an edit writes it too.
  const file = lastValueOf(read, '--file', '-f');
  if (file && writes) analyzer.addPath(file, 'write', true);
  if (!writes || file) return;
  if (hasOption(read, '--global')) {
    const home = analyzer.lookup('HOME');
    analyzer.addPath(home === null ? { kind: 'unknown', knownPrefix: '', raw, splits: false } : literalArg(`${home ?? analyzer.home}/.gitconfig`, raw), 'write', true);
  }
  else if (hasOption(read, '--system')) analyzer.addPath(literalArg('/etc/gitconfig', raw), 'write', true);
  else {
    // `--worktree` writes .git/config.worktree when extensions.worktreeConfig is on, and .git/config when it is off.
    const files = hasOption(read, '--worktree') ? ['.git/config.worktree', '.git/config'] : ['.git/config'];
    for (const file of files) analyzer.addPath(analyzer.base === null ? here : literalArg(file), 'write', true);
  }
}

export function git(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const global = readArgs(GIT, rest);
  const subword = rest[global.next];
  const hidden = global.unknown[0] ?? (subword?.kind === 'unknown' ? subword : undefined);
  if (hidden) {
    analyzer.dynamic(`git takes ${hidden.raw} from a variable, which may be a global option or the subcommand`);
    return;
  }
  let cwd: Cwd | null = null;
  const start = analyzer.cwdNow;
  for (const option of global.options) {
    const v = option.value;
    const moves = dirSpecOf(option);
    if (moves) {
      cwd = movedBy(analyzer, moves, v, cwd ?? start, start) ?? cwd;
    } else if (isOption(option, '-c')) {
      configKey(ctx, 'git -c', v);
      const repointed = v?.kind === 'known' ? GIT_REMOTE_URL_CONFIG.exec(v.text) : null;
      if (repointed) analyzer.gitRemotes.add(repointed[1]);
    } else if (isOption(option, '--config-env')) {
      if (v?.kind === 'unknown') analyzer.dynamic(`git --config-env ${v.raw} takes a config key from a variable`);
      else if (v && GIT_EXEC_CONFIG.test(v.text)) analyzer.dynamic(`git --config-env ${v.text} makes git run a program from the environment`);
    } else if (isOption(option, '--git-dir', '--work-tree')) {
      if (v) analyzer.within(cwd ?? analyzer.cwdNow, () => analyzer.addPath(v, 'read', true));
    } else if (isOption(option, '--exec-path')) {
      analyzer.dynamic('git --exec-path changes which programs git runs');
    }
  }
  const sub = textOf(subword);
  const spec = gitSubcommand(sub);
  const read = readArgs(spec, rest.slice(global.next + 1));
  runsCommand(ctx, sub, read);
  configOptions(ctx, sub, read);
  if (sub === 'send-email') analyzer.flag('upload', 'it uploads data: git send-email mails patches from this repo');
  const handle = (): void => {
    applyEffects(ctx, `git ${sub}`, spec, read);
    if (sub === 'remote') return remote(ctx, read);
    if (sub === 'push') return push(ctx, read);
    const raw = subword?.raw ?? '.';
    const here: Arg = analyzer.base === null ? { kind: 'unknown', knownPrefix: '', raw, splits: false } : literalArg('.', raw);
    if (sub === 'config') return config(ctx, read, here, raw);
    if (sub === 'add') add(ctx, read);
    if (sub === 'reset' && hasOption(read, '--hard')) analyzer.destroy(here, 'git reset --hard');
    if (sub === 'clean' && hasOption(read, '-f', '--force')) analyzer.destroy(here, 'git clean -f');
    generic(ctx, read.operands.filter((a) => !isUrl(literalStart(a))), true);
  };
  return cwd ? analyzer.within(cwd, handle) : handle();
}
