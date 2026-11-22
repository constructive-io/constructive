/**
 * Commands that talk to other machines: uploads (`curl -d @file`, `scp` to a
 * host, publishing a package), servers and tunnels that expose the project to
 * the network, and raw network tools.
 */

import { type Arg, literalStart } from './analyze';
import { type CommandContext, firstOperand, generic, has, looksLikePath, parse, pathLikeArgs, restOf, textOf, valuesOf } from './args';
import { isLoopbackHost, isRemoteSpec, isUrl } from './words';

const CURL_WITH_VALUE = new Set([
  '-d',
  '-F',
  '-T',
  '-H',
  '-o',
  '-u',
  '-X',
  '-A',
  '-e',
  '-b',
  '-c',
  '-K',
  '-E',
  '-x',
  '-w',
  '-m',
  '-y',
  '-Y',
  '-z',
  '-C',
  '-r',
  '-Q',
  '-D',
  '-U',
  '-t',
  '--data',
  '--data-binary',
  '--data-raw',
  '--data-ascii',
  '--data-urlencode',
  '--json',
  '--form',
  '--form-string',
  '--upload-file',
  '--header',
  '--output',
  '--config',
  '--url',
  '--user',
  '--request',
  '--cookie',
  '--cookie-jar',
  '--proxy',
  '--cert',
  '--key',
  '--cacert',
  '--dump-header',
  '--write-out',
  '--max-time',
  '--connect-timeout',
  '--retry',
  '--referer',
  '--user-agent',
  '--range',
  '--resolve',
  '--output-dir'
]);

function isLocalUrl(url: string): boolean {
  const m = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/]*@)?(\[[^\]]*\]|[^:/?#]*)/i.exec(url);
  return isLoopbackHost(m?.[1] ?? '');
}

export function curl(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const p = parse(rest, CURL_WITH_VALUE);
  const say = (detail: string) => analyzer.flag('upload', `it uploads data: ${detail}`);
  let dataForms = false;
  for (const key of ['-d', '--data', '--data-binary', '--data-raw', '--data-ascii', '--json']) {
    for (const v of p.values.get(key) ?? []) {
      dataForms = true;
      if (v.kind === 'unknown') say(`curl ${key} with a value from a variable or substitution`);
      if (literalStart(v).startsWith('@')) {
        say(`curl ${key} ${v.raw} sends a file's contents`);
        if (textOf(v) !== '@-') analyzer.addPath(restOf(v, 1), 'read', true);
      }
    }
  }
  for (const v of p.values.get('--data-urlencode') ?? []) {
    dataForms = true;
    const at = literalStart(v).indexOf('@');
    if (at >= 0) {
      say(`curl --data-urlencode ${v.raw} sends a file's contents`);
      const file = restOf(v, at + 1);
      if (textOf(file) !== '-') analyzer.addPath(file, 'read', true);
    } else if (v.kind === 'unknown') {
      say('curl --data-urlencode with a value from a variable or substitution, which may name a file');
    }
  }
  for (const v of valuesOf(p, '-F', '--form')) {
    dataForms = true;
    const m = /=([@<])([^;]*)/.exec(literalStart(v));
    if (m) {
      say(`curl -F ${v.raw} sends a file`);
      if (m[2] !== '-') analyzer.addPath(restOf(v, m.index + 2), 'read', true);
    } else if (v.kind === 'unknown') {
      say('curl -F with a value from a variable or substitution, which may name a file');
    }
  }
  for (const v of valuesOf(p, '-T', '--upload-file')) {
    dataForms = true;
    say(`curl -T ${v.raw} uploads a file`);
    if (textOf(v) !== '-' && textOf(v) !== '.') analyzer.addPath(v, 'read', true);
  }
  for (const v of valuesOf(p, '-H', '--header')) {
    const start = literalStart(v);
    if (start.startsWith('@')) {
      say(`curl -H ${v.raw} sends headers from a file`);
      analyzer.addPath(restOf(v, 1), 'read', true);
    } else if (start === '') {
      say('curl -H with a value from a variable or substitution, which may name a file');
    }
  }
  for (const v of valuesOf(p, '-K', '--config')) {
    analyzer.dynamic(`curl ${textOf(v) === '-' ? 'reads its options from stdin' : `reads its options from ${v.raw}`}`);
    if (textOf(v) !== '-') analyzer.addPath(v, 'read', true);
  }
  for (const v of valuesOf(p, '-o', '--output', '-c', '--cookie-jar', '-D', '--dump-header')) {
    if (textOf(v) !== '-') analyzer.addPath(v, 'write', true);
  }
  for (const v of valuesOf(p, '--output-dir')) analyzer.addPath(v, 'write', true);
  for (const v of valuesOf(p, '-E', '--cert', '--key', '--cacert', '-b', '--cookie')) {
    if (looksLikePath(v)) analyzer.addPath(v, 'read', true);
  }
  const urls = [...p.positionals, ...valuesOf(p, '--url')];
  for (const u of p.positionals) {
    const start = literalStart(u);
    if (!isUrl(start) && looksLikePath(u) && !/^[\w.-]+:\d/.test(start)) analyzer.operand(u);
  }
  const remote = urls.length === 0 || urls.some((u) => u.kind === 'unknown' || !isLocalUrl(u.text));
  if (ctx.stdinFed && dataForms) say('curl sends data it reads from stdin');
  else if (ctx.stdinFed && remote) say('curl gets piped input and talks to a remote host');
}

export function wget(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const p = parse(
    rest,
    new Set(['-O', '-o', '-a', '-P', '-i', '--post-file', '--body-file', '--post-data', '--body-data', '--output-document', '--input-file'])
  );
  for (const v of valuesOf(p, '--post-file', '--body-file')) {
    analyzer.flag('upload', `it uploads data: wget sends ${v.raw}`);
    analyzer.addPath(v, 'read', true);
  }
  // Like curl -d: a body built from a variable may carry anything.
  for (const key of ['--post-data', '--body-data']) {
    for (const v of p.values.get(key) ?? []) {
      if (v.kind === 'unknown') analyzer.flag('upload', `it uploads data: wget ${key} with a value from a variable or substitution`);
    }
  }
  for (const v of valuesOf(p, '-O', '--output-document', '-o', '-a', '-P')) {
    if (textOf(v) !== '-') analyzer.addPath(v, 'write', true);
  }
  for (const v of valuesOf(p, '-i', '--input-file')) if (textOf(v) !== '-') analyzer.addPath(v, 'read', true);
  const remote = p.positionals.length === 0 || p.positionals.some((u) => u.kind === 'unknown' || !isLocalUrl(u.text));
  if (ctx.stdinFed && remote) analyzer.flag('upload', 'it uploads data: wget gets piped input and talks to a remote host');
}

export function remoteCopy(name: string, ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const withValue =
    name === 'scp'
      ? new Set(['-i', '-F', '-P', '-o', '-c', '-l', '-S', '-J'])
      : new Set(['-e', '--rsh', '--exclude', '--include', '--exclude-from', '--include-from', '--files-from', '-f', '--filter']);
  const p = parse(rest, withValue);
  for (const v of valuesOf(p, '-i', '-F', '--exclude-from', '--include-from', '--files-from')) {
    if (textOf(v) === '-') analyzer.flag('stdin-operands', `${name} takes file names from its input, which cannot be checked before it runs`);
    else analyzer.addPath(v, 'read', true);
  }
  const ops = p.positionals;
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

export function ssh(ctx: CommandContext, rest: readonly Arg[]): void {
  const { analyzer } = ctx;
  const p = parse(rest, new Set(['-i', '-F', '-o', '-p', '-l', '-J', '-L', '-R', '-D', '-E', '-S', '-W', '-b', '-c', '-e', '-m', '-O', '-Q', '-w']));
  for (const v of valuesOf(p, '-i', '-F')) analyzer.addPath(v, 'read', true);
  if (has(p, '-R')) expose(ctx, 'ssh -R forwards a port from a remote host to this machine');
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
