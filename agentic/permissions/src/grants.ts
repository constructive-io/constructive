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

import { partIs, prefixCovers, prefixFor, showPrefix } from './command-prefix';
import { commonParent, contains, displayDir } from './paths';
import { SIGNAL_RULES } from './signals';
import type { Access, CommandPart, Grant, GrantMatch, GrantOption, GrantScope, PermissionRequest, Signal, Target } from './types';

/** Signals a grant must never cover: each such call needs its own yes. */
export const NEVER_GRANTED: readonly Signal[] = (Object.keys(SIGNAL_RULES) as Signal[]).filter((s) => !SIGNAL_RULES[s].grantable);

/** The most prefixes one "allow again" answer saves; a longer chain gets the exact command. */
const MAX_PREFIXES = 5;

export function isGrantable(request: PermissionRequest): boolean {
  return !request.signals.some((s) => NEVER_GRANTED.includes(s));
}

/** The parts a prefix may cover: a bash call's, when it raises no signal at all. */
function prefixableParts(request: PermissionRequest): CommandPart[] | undefined {
  return request.toolName === 'bash' && request.signals.length === 0 ? request.parts : undefined;
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

export const ACCESS_VERB: Readonly<Record<Access, string>> = { read: 'reads', write: 'writes', exec: 'runs' };

/** What a grant covers, in words: "reads in ~/work/lib/", "bash: pnpm dlx shadcn add button", "bash: git status *". */
export function describeGrant(match: GrantMatch, homeDir: string): string {
  switch (match.type) {
  case 'command':
    return `bash: ${match.command}`;
  case 'command-prefix':
    return `bash: ${match.prefixes.map(showPrefix).join(', ')}`;
  case 'path':
    return `${ACCESS_VERB[match.access]} in ${displayDir(match.pathPrefix, homeDir)}`;
  }
}

/**
 * One prefix for each part that `held` does not cover yet, or `null` when the
 * grant must be the exact command: the call raises a signal or is not a plain
 * list, a part's program has no prefix, or the chain needs too many.
 */
function newPrefixes(request: PermissionRequest, held: readonly Grant[]): string[] | null {
  const parts = prefixableParts(request);
  if (!parts) return null;
  const prefixes = new Set<string>();
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
function commandOption(scope: GrantScope, request: PermissionRequest, grants: readonly Grant[]): GrantOption {
  const held = scope === 'chat' ? grants : grants.filter((g) => g.scope === 'project');
  const prefixes = newPrefixes(request, held);
  const match: GrantMatch = prefixes ? { type: 'command-prefix', prefixes } : { type: 'command', command: request.command };
  const pattern = prefixes ? prefixes.map(showPrefix).join(', ') : request.command;
  return { scope, label: scope === 'chat' ? 'Allow in this chat' : `Always allow ${pattern}`, pattern, match };
}

function pathOptions(request: PermissionRequest, homeDir: string): GrantOption[] {
  if (!pathGrantable(request)) return [];
  const access = request.targets[0].access;
  if (request.targets.some((t) => t.access !== access)) return [];
  const prefix = commonParent(request.targets.map((t) => t.path));
  const match: GrantMatch = { type: 'path', access, pathPrefix: prefix };
  const pattern = displayDir(prefix, homeDir);
  return [
    { scope: 'chat', label: 'Allow in this chat', pattern, match },
    { scope: 'project', label: `Always allow ${describeGrant(match, homeDir)}`, pattern, match }
  ];
}

/** The scopes the user may pick on an ASK: this chat, or always for this project. `grants` are the ones already held. */
export function grantOptionsFor(request: PermissionRequest, homeDir: string, grants: readonly Grant[] = []): GrantOption[] {
  if (!isGrantable(request)) return [];
  if (request.toolName !== 'bash') return pathOptions(request, homeDir);
  if (!request.command) return [];
  return [commandOption('chat', request, grants), commandOption('project', request, grants)];
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
