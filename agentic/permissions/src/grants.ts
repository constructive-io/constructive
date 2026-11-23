/**
 * Grants: "allow this again" answers, keyed by what the call touches.
 *
 * A path grant covers a file tool call whose every target sits inside its
 * folder with the same access. A command grant covers a bash call with the
 * exact same normalized command. A command-prefix grant covers a bash call
 * part by part, and only a call that raises no signal: every part must start
 * with a prefix (this grant's or another's) or be exactly an exact grant's
 * command. Nothing ever matches on a tool name alone.
 */

import * as path from 'node:path';

import { commandPattern, isExactKey, isStoredPrefix } from './command-pattern';
import { MAX_PREFIXES, partIs, prefixCovers, prefixFor } from './command-prefix';
import { grantOptionLabel } from './grant-copy';
import { commonParent, contains, displayDir } from './paths';
import { byRequest } from './requests';
import { SIGNAL_RULES } from './signals';
import type {
  Access,
  BashRequest,
  CommandMatch,
  CommandPart,
  CommandPrefixMatch,
  FileRequest,
  Grant,
  GrantMatch,
  GrantOption,
  GrantScope,
  ListedPrefix,
  PathPattern,
  PermissionRequest,
  Signal,
  Target
} from './types';

/** Signals a grant must never cover: each such call needs its own yes. */
export const NEVER_GRANTED: readonly Signal[] = (Object.keys(SIGNAL_RULES) as Signal[]).filter((s) => !SIGNAL_RULES[s].grantable);

export function isGrantable(request: PermissionRequest): boolean {
  return !request.signals.some((s) => NEVER_GRANTED.includes(s));
}

/**
 * The parts grants may cover one by one: a bash call's, when it raises no
 * signal and writes no file the analysis sees (`touch`, `sort -o`, `git log
 * --output`). Ask mode asks before a file change, so only an exact grant of
 * the whole command covers a call that writes one.
 */
function prefixableParts(request: PermissionRequest): CommandPart[] | undefined {
  if (request.toolName !== 'bash' || request.signals.length > 0) return undefined;
  return request.targets.some((t) => t.access === 'write') ? undefined : request.parts;
}

/** `match` covers one part of a call that raises no signal. */
function coversPart(match: GrantMatch, part: CommandPart): boolean {
  if (match.type === 'command-prefix') return match.prefixes.some((p) => prefixCovers(p, part));
  if (match.type === 'command') return partIs(match.command, part);
  return false;
}

/** `match` alone covers the request. */
export function matchCovers(match: GrantMatch, request: PermissionRequest): boolean {
  switch (match.type) {
  case 'command':
    return request.toolName === 'bash' && request.command !== undefined && request.command === match.command;
  case 'command-prefix': {
    const parts = prefixableParts(request);
    return parts !== undefined && parts.every((p) => coversPart(match, p));
  }
  case 'path':
    if (request.toolName === 'bash' || !pathGrantable(request)) return false;
    return request.targets.every(
      (t) => t.access === match.access && t.zone !== 'unresolvable' && contains(match.pathPrefix, t.path)
    );
  }
}

/** A glob outside the project: a folder grant cannot say where it expands to. */
function isOutsideGlob(t: Target): boolean {
  return Boolean(t.glob) && t.zone !== 'workspace' && t.zone !== 'temp';
}

/** A folder grant can hold the request: it has targets, and none is a glob outside the project. */
function pathGrantable(request: PermissionRequest): boolean {
  return request.targets.length > 0 && !request.targets.some(isOutsideGlob);
}

function chatFirst(grants: readonly Grant[]): Grant[] {
  return [...grants.filter((g) => g.scope === 'chat'), ...grants.filter((g) => g.scope !== 'chat')];
}

/**
 * The grants that cover the request, chat grants first: one that covers it
 * alone, or one per part of a call with no signal. Empty when nothing covers
 * it, and always for an ungrantable request.
 */
export function findGrants(grants: readonly Grant[], request: PermissionRequest): Grant[] {
  if (!isGrantable(request)) return [];
  const ordered = chatFirst(grants);
  const whole = ordered.find((g) => matchCovers(g.match, request));
  if (whole) return [whole];
  const parts = prefixableParts(request);
  if (!parts) return [];
  const used = new Set<Grant>();
  for (const part of parts) {
    const grant = ordered.find((g) => coversPart(g.match, part));
    if (!grant) return [];
    used.add(grant);
  }
  return [...used];
}

/**
 * One prefix for each part that `held` does not cover yet, or `null` when the
 * grant must be the exact command: the call raises a signal or is not a plain
 * list, a part's program has no prefix, or the chain needs too many.
 */
function newPrefixes(request: BashRequest, held: readonly Grant[]): ListedPrefix[] | null {
  const parts = prefixableParts(request);
  if (!parts) return null;
  const prefixes = new Set<ListedPrefix>();
  for (const part of parts) {
    if (held.some((g) => coversPart(g.match, part))) continue;
    const prefix = prefixFor(part);
    if (prefix === null) return null;
    prefixes.add(prefix);
  }
  return prefixes.size > 0 && prefixes.size <= MAX_PREFIXES ? [...prefixes] : null;
}

/**
 * A bash option for one scope. The chat option leaves out parts any grant
 * already covers, the project option only those a project grant covers, so
 * the project grant still holds in the next chat.
 */
function commandOption(scope: GrantScope, request: BashRequest, grants: readonly Grant[], homeDir: string): GrantOption {
  const held = scope === 'chat' ? grants : grants.filter((g) => g.scope === 'project');
  const prefixes = newPrefixes(request, held);
  const match: CommandMatch | CommandPrefixMatch = prefixes
    ? { type: 'command-prefix', prefixes }
    : { type: 'command', command: request.command };
  return { scope, label: grantOptionLabel(scope, match, homeDir), pattern: commandPattern(match), match };
}

function pathOptions(request: FileRequest, homeDir: string): GrantOption[] {
  if (!pathGrantable(request)) return [];
  const access = request.targets[0].access;
  if (request.targets.some((t) => t.access !== access)) return [];
  const prefix = commonParent(request.targets.map((t) => t.path));
  const match: GrantMatch = { type: 'path', access, pathPrefix: prefix };
  const pattern: PathPattern = { kind: 'path', text: displayDir(prefix, homeDir) };
  return (['chat', 'project'] as const).map((scope) => ({ scope, label: grantOptionLabel(scope, match, homeDir), pattern, match }));
}

/** The scopes the user may pick on an ASK: this chat, or always for this project. `grants` are the ones already held. */
export function grantOptionsFor(request: PermissionRequest, homeDir: string, grants: readonly Grant[] = []): GrantOption[] {
  if (!isGrantable(request)) return [];
  return byRequest(request, {
    bash: (r) => (r.command === '' ? [] : [commandOption('chat', r, grants, homeDir), commandOption('project', r, grants, homeDir)]),
    file: (r) => pathOptions(r, homeDir)
  });
}

const ACCESSES: readonly string[] = ['read', 'write', 'exec'];

/**
 * A stored grant's match, checked by the rules the engine saves grants with:
 * at most `MAX_PREFIXES` listed prefixes written as a card writes them, an
 * exact command that is its own key, or a path grant on an absolute,
 * normalized path. `null` for anything else, so a host can drop an edited or
 * damaged grant when it loads its store instead of trusting it. Returns a
 * clean copy without other fields.
 */
export function parseGrantMatch(value: unknown): GrantMatch | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  switch (v.type) {
  case 'command':
    return typeof v.command === 'string' && isExactKey(v.command) ? { type: 'command', command: v.command } : null;
  case 'command-prefix': {
    const { prefixes } = v;
    if (!Array.isArray(prefixes) || prefixes.length === 0 || prefixes.length > MAX_PREFIXES) return null;
    if (!prefixes.every((p): p is ListedPrefix => typeof p === 'string' && isStoredPrefix(p))) return null;
    return { type: 'command-prefix', prefixes: [...new Set(prefixes)] };
  }
  case 'path': {
    const { access, pathPrefix } = v;
    if (typeof access !== 'string' || !ACCESSES.includes(access)) return null;
    if (typeof pathPrefix !== 'string' || !path.isAbsolute(pathPrefix) || path.normalize(pathPrefix) !== pathPrefix) return null;
    return { type: 'path', access: access as Access, pathPrefix };
  }
  default:
    return null;
  }
}

/** The grant one of an ASK's options saves. */
export function grantFrom(option: GrantOption, now: Date = new Date()): Grant {
  return { scope: option.scope, match: option.match, createdAt: now.toISOString() };
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((x) => right.has(x));
}

/** Two matches are the same grant (for de-duplicating a store). */
export function sameMatch(a: GrantMatch, b: GrantMatch): boolean {
  if (a.type === 'command' && b.type === 'command') return a.command === b.command;
  if (a.type === 'command-prefix' && b.type === 'command-prefix') return sameSet(a.prefixes, b.prefixes);
  if (a.type === 'path' && b.type === 'path') return a.access === b.access && a.pathPrefix === b.pathPrefix;
  return false;
}

/**
 * Where a host keeps project grants. Desktop keeps one JSON file per project;
 * a worktree project reads and writes its parent's.
 */
export interface GrantStore {
  list(): readonly Grant[] | Promise<readonly Grant[]>;
  add(grant: Grant): void | Promise<void>;
}

/** An in-memory store (tests, and hosts with no persistence). */
export function memoryGrantStore(initial: readonly Grant[] = []): GrantStore & { grants: Grant[] } {
  const grants = [...initial];
  return {
    grants,
    list: () => grants,
    add(grant) {
      if (!grants.some((g) => sameMatch(g.match, grant.match))) grants.push(grant);
    }
  };
}
