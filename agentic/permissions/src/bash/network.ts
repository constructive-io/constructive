/**
 * Commands that talk to other machines: uploads (`curl -d @file`, `scp` to a
 * host, publishing a package), servers and tunnels that expose the project to
 * the network, and raw network tools.
 */

import { type Arg, literalStart } from './analyze';
import { type CommandContext, firstOperand, generic, looksLikePath, pathLikeArgs, textOf } from './args';
import { effectOf, hasEffect, hasOption, isOption, namedFiles, type ReadArgs, readArgs, type ReadOption, valuesOf as valuesRead } from './options';
import { CURL, RSYNC, SCP, SSH, WGET } from './programs';
import { applyEffects } from './scripts';
import { isLoopbackHost, isRemoteSpec, isUrl } from './words';


function isLocalUrl(url: string): boolean {
  const m = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/]*@)?(\[[^\]]*\]|[^:/?#]*)/i.exec(url);
  return isLoopbackHost(m?.[1] ?? '');
}

/** curl's options that send data: their values are the request body, a form, a query or a file it uploads. */
const CURL_DATA = ['-d', '--data', '--data-binary', '--data-raw', '--data-ascii', '--json', '--data-urlencode', '--url-query', '-F', '--form', '--form-string', '-T', '--upload-file'];

/** The files an option's value names, by the forms its specs read (`-d @file`, `-F 'f=@a;headers=@b'`). */
function filesOf(option: ReadOption): Arg[] {
  return option.specs.flatMap((s) => (effectOf(s) === 'reads-file' && hasEffect(s, 'reads-file', option.value) ? namedFiles(s, option.value) : []));
}

/**
 * curl: the registry reads every file a value names, in the form curl reads
 * for that option; here a data option that sends a file, or a value the
 * analysis cannot see, is an upload.
 */
export function curl(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const read = readArgs(CURL, rest);
  const say = (detail: string) => analyzer.flag('upload', `it uploads data: ${detail}`);
  applyEffects(ctx, 'curl', CURL, read);
  let dataForms = false;
  for (const option of read.options) {
    const v = option.value;
    if (!v) continue;
    const sends = filesOf(option).length > 0;
    if (isOption(option, ...CURL_DATA)) {
      dataForms = true;
      if (isOption(option, '-T', '--upload-file')) say(`curl ${option.name} ${v.raw} uploads a file`);
      else if (sends) say(`curl ${option.name} ${v.raw} sends a file's contents`);
      else if (v.kind === 'unknown') say(`curl ${option.name} with a value from a variable or substitution`);
    } else if (sends && isOption(option, '-H', '--header')) {
      say(`curl ${option.name} ${v.raw} sends headers from a file`);
    } else if (isOption(option, '-K', '--config')) {
      analyzer.dynamic(`curl ${textOf(v) === '-' ? 'reads its options from stdin' : `reads its options from ${v.raw}`}`);
    }
  }
  const urls = [...read.positionals, ...valuesRead(read, '--url')];
  for (const u of read.positionals) {
    const start = literalStart(u);
    if (!isUrl(start) && looksLikePath(u) && !/^[\w.-]+:\d/.test(start)) analyzer.operand(u);
  }
  const remote = urls.length === 0 || urls.some((u) => u.kind === 'unknown' || !isLocalUrl(u.text));
  if (ctx.stdinFed && dataForms) say('curl sends data it reads from stdin');
  else if (ctx.stdinFed && remote) say('curl gets piped input and talks to a remote host');
}

export function wget(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const read = readArgs(WGET, rest);
  for (const v of valuesRead(read, '--post-file', '--body-file')) analyzer.flag('upload', `it uploads data: wget sends ${v.raw}`);
  // Like curl -d: a body built from a variable may carry anything.
  for (const key of ['--post-data', '--body-data']) {
    for (const v of valuesRead(read, key)) {
      if (v.kind === 'unknown') analyzer.flag('upload', `it uploads data: wget ${key} with a value from a variable or substitution`);
    }
  }
  applyEffects(ctx, 'wget', WGET, read);
  const remote = read.positionals.length === 0 || read.positionals.some((u) => u.kind === 'unknown' || !isLocalUrl(u.text));
  if (ctx.stdinFed && remote) analyzer.flag('upload', 'it uploads data: wget gets piped input and talks to a remote host');
}

export function remoteCopy(name: 'scp' | 'rsync', ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const spec = name === 'scp' ? SCP : RSYNC;
  const read = readArgs(spec, rest);
  const fromStdin = valuesRead(read, '--exclude-from', '--include-from', '--files-from').some((v) => textOf(v) === '-');
  if (fromStdin) analyzer.flag('stdin-operands', `${name} takes file names from its input, which cannot be checked before it runs`);
  applyEffects(ctx, name, spec, { ...read, options: read.options.filter((o) => textOf(o.value) !== '-') });
  const ops = read.operands;
  if (ops.length === 0) return;
  const dest = ops[ops.length - 1];
  const sources = ops.slice(0, -1);
  if (dest.kind === 'unknown' || isRemoteSpec(dest.text)) {
    analyzer.flag('upload', `it uploads data: ${name} copies to the remote ${dest.raw}`);
  } else {
    analyzer.addPath(dest, 'write', true);
  }
  for (const s of sources) if (s.kind === 'unknown' || !isRemoteSpec(s.text)) analyzer.addPath(s, 'read', true);
}

/**
 * ssh's options as OpenSSH reads them: getopt up to the destination, then
 * again after it up to the first word of the remote command, unless `--`
 * ended the options.
 */
function sshArgs(rest: readonly Arg[]): ReadArgs {
  const before = readArgs(SSH, rest);
  if (before.ended || before.next >= rest.length - 1) return before;
  const after = readArgs(SSH, rest.slice(before.next + 1));
  return { ...after, options: [...before.options, ...after.options], unknown: [...before.unknown, ...after.unknown] };
}

export function ssh(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const read = sshArgs(rest);
  applyEffects(ctx, 'ssh', SSH, read);
  if (hasOption(read, '-R')) expose(ctx, 'ssh -R forwards a port from a remote host to this machine');
  if (ctx.stdinFed) analyzer.flag('upload', 'it uploads data: ssh gets piped input');
}

function expose(ctx: CommandContext, what: string): void {
  ctx.analyzer.flag('network-exposure', `it exposes this machine to the network: ${what}`);
}

/** Tunnels that put a local port on the internet. */
export const TUNNELS = new Set(['ngrok', 'cloudflared', 'localtunnel', 'lt']);

export function tunnel(name: string, ctx: CommandContext, rest: readonly Arg[]): void {
  expose(ctx, `${name} opens a public tunnel to a local port`);
  generic(ctx, pathLikeArgs(rest));
}

/** The value of one option, as `-b X`, `-bX`, `--bind X` or `--bind=X`. */
function optionValue(rest: readonly Arg[], short: string | null, long: string | null): string | undefined {
  for (let k = 0; k < rest.length; k++) {
    const t = textOf(rest[k]) ?? '';
    if (t === short || t === long) return textOf(rest[k + 1]) ?? '';
    if (long && t.startsWith(`${long}=`)) return t.slice(long.length + 1);
    if (short && t.startsWith(short) && t.length > short.length && !t.startsWith('--')) return t.slice(short.length);
  }
  return undefined;
}

/** The host of `host:port`, `[::1]:port` or a bare host. */
function hostOf(address: string): string {
  const v6 = /^\[([^\]]*)\]/.exec(address);
  if (v6) return v6[1];
  const colon = address.lastIndexOf(':');
  return colon > 0 && address.indexOf(':') === colon ? address.slice(0, colon) : address;
}

/** A dev server that serves files on an address: asks unless it is loopback only. */
function serves(ctx: CommandContext, what: string, address: string | undefined): void {
  if (address !== undefined && address !== '' && isLoopbackHost(hostOf(address))) return;
  expose(ctx, `${what} serves files on ${address ? hostOf(address) : 'every network interface'}`);
}

/** `python -m http.server` binds every interface unless `--bind` says otherwise. */
export function pythonServer(ctx: CommandContext, module: string, args: readonly Arg[]): void {
  if (module === 'SimpleHTTPServer') serves(ctx, 'python -m SimpleHTTPServer', undefined);
  else if (module === 'http.server') serves(ctx, 'python -m http.server', optionValue(args, '-b', '--bind'));
}

/** `php -S host:port`. */
export function phpServer(ctx: CommandContext, rest: readonly Arg[]): void {
  const address = optionValue(rest, '-S', null);
  if (address !== undefined) serves(ctx, 'php -S', address);
}

/** `ruby -run -e httpd`. */
export function rubyServer(ctx: CommandContext, rest: readonly Arg[]): void {
  const un = rest.some((a, k) => textOf(a) === '-run' || (textOf(a) === '-r' && textOf(rest[k + 1]) === 'un'));
  if (un && rest.some((a) => textOf(a) === 'httpd')) serves(ctx, 'ruby -run -e httpd', optionValue(rest, null, '--bind-address'));
}

/** `busybox httpd -p [ip:]port`. */
export function busyboxServer(ctx: CommandContext, rest: readonly Arg[]): void {
  const port = optionValue(rest, '-p', null);
  serves(ctx, 'busybox httpd', port !== undefined && port.includes(':') ? port : undefined);
}

/** Commands that send a package or an image to a registry, by program, and the subcommand that does. */
const PUBLISH = new Map([
  ['npm', 'publish'],
  ['pnpm', 'publish'],
  ['yarn', 'publish'],
  ['bun', 'publish'],
  ['gem', 'push'],
  ['twine', 'upload'],
  ['cargo', 'publish'],
  ['docker', 'push'],
  ['podman', 'push']
]);

/** `npm publish`, `docker push`, …: an upload. */
export function publishes(name: string, ctx: CommandContext, rest: readonly Arg[]): void {
  const sub = PUBLISH.get(name);
  if (!sub) return;
  if (rest.some((a) => textOf(a) === sub)) ctx.analyzer.flag('upload', `it uploads data: ${name} ${sub} sends it to a registry`);
  else if (firstOperand(rest)?.kind === 'unknown') ctx.analyzer.flag('upload', `it uploads data: ${name} takes its subcommand from a variable, which may be ${sub}`);
}
