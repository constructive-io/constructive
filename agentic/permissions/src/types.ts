/**
 * The shared vocabulary of the permissions layer. Everything here is plain data
 * so a host can store it, show it, and assert on it in a test.
 */

/** How much the agent may do without asking. The hard-deny list, redaction and
 * self-protection apply in every mode; the mode only moves the defaults. */
export type PermissionMode = 'ask' | 'workspace' | 'full';

export const PERMISSION_MODES: readonly PermissionMode[] = ['ask', 'workspace', 'full'];

export const DEFAULT_PERMISSION_MODE: PermissionMode = 'workspace';

/** The pi built-in tools this layer owns. Every other tool belongs to another
 * gate (the DB gate) or to trusted host code, and the layer abstains on it. */
export type BuiltinTool = 'read' | 'write' | 'edit' | 'bash' | 'grep' | 'find' | 'ls';

export type Access = 'read' | 'write' | 'exec';

export type RequestKind = 'read' | 'write' | 'exec';

/** What each built-in does: the request kind it makes. */
export const TOOL_KIND = {
  read: 'read',
  write: 'write',
  edit: 'write',
  bash: 'exec',
  grep: 'read',
  find: 'read',
  ls: 'read'
} as const satisfies Readonly<Record<BuiltinTool, RequestKind>>;

export const BUILTIN_TOOLS: ReadonlySet<string> = new Set(Object.keys(TOOL_KIND));

export function isBuiltinTool(name: string): name is BuiltinTool {
  return BUILTIN_TOOLS.has(name);
}

/**
 * Where a canonical path sits. Computed from the roots, most specific first:
 * `hard-deny` and `protected` win over `workspace`, so `.pi/` inside the
 * workspace is `protected`, and a credential file under a temp dir is `hard-deny`.
 */
export type Zone =
  | 'workspace'
  | 'trusted'
  | 'temp'
  | 'outside'
  | 'hard-deny'
  | 'protected'
  | 'ask-write'
  | 'unresolvable';

export interface Target {
  /** The path as the agent wrote it. */
  raw: string;
  /** Absolute and canonical (realpath of the deepest existing ancestor). */
  path: string;
  access: Access;
  zone: Zone;
  /** The file name matches a secret-file pattern (`.env`, `*.pem`, …). */
  secretFile: boolean;
  /** What the zone's root is, in words: "SSH keys", "git hook", "project". */
  label: string;
  /** The path holds an unexpanded glob (`~/.ss?/*`): no path grant covers it outside the project. */
  glob?: boolean;
}

export type Signal =
  | 'secret-file'
  | 'outside-workspace'
  | 'hard-deny'
  | 'protected-write'
  | 'ask-write'
  | 'shell-dynamic'
  | 'sudo'
  | 'upload'
  | 'destructive'
  | 'placeholder-in-command'
  | 'secret-into-plain-file'
  | 'unresolvable-path'
  /** `xargs` or an archiver takes file names from stdin that the analyzer cannot see. */
  | 'stdin-operands'
  /** `crontab`, `at`, `launchctl load`, `defaults write`: a change that outlasts the session. */
  | 'persistence'
  /** A dev server on a public interface, or a tunnel (`ngrok`, `ssh -R`). */
  | 'network-exposure'
  /** `pbcopy`, `pbpaste`, `xclip`, … */
  | 'clipboard'
  /** A secret file read by a program that may change its text, so redaction cannot match it. */
  | 'secret-transform'
  /** The command expands a variable whose name looks secret, or that the host marked secret. */
  | 'secret-env-expansion';

/** One simple command of a bash call (`git status` in `git status && npm test`). */
export interface CommandPart {
  /** The words as written, quotes kept; redirections are not words. */
  words: string[];
  /**
   * An output redirection opens a file: anything but a copy of a descriptor
   * (`2>&1`), input (`<`, a heredoc, a here-string) or the exact path `/dev/null`.
   */
  writesFile: boolean;
  /** Its input redirections as written (`< src/a.ts`), which are part of its exact identity. */
  inputs: string[];
  /**
   * The options it passes, after quote removal and brace expansion, `--` and
   * the words after it included; `null` when a word may hold an option the
   * lexer cannot read (an unquoted variable, or a quoted one at its start).
   */
  options: string[] | null;
}

interface RequestBase {
  toolCallId: string;
  targets: Target[];
  signals: Signal[];
  /** One specific sentence for each signal ("it uploads data: curl -d @.env sends a file's contents"). */
  signalReasons: Partial<Record<Signal, string>>;
}

/** A bash call, classified. */
export interface BashRequest extends RequestBase {
  toolName: 'bash';
  kind: 'exec';
  /** The command as its exact-grant key: runs of spaces and tabs made one space where that keeps its meaning. */
  command: CommandKey;
  /**
   * The simple commands of a plain list or pipeline, in order. Absent when
   * the command uses other shell syntax (`if`, `for`, `{ … }`, a function, a
   * substitution, a heredoc), changes dir (`cd`, `pushd`, `popd`) or does not
   * parse: only an exact grant covers it.
   */
  parts?: CommandPart[];
}

/** The built-in tools that work on a path: everything but `bash`. */
export type FileTool = Exclude<BuiltinTool, 'bash'>;

/** A file tool call (`read`, `write`, `edit`, `grep`, `find`, `ls`), classified: its targets are the paths it touches. */
export interface FileRequest extends RequestBase {
  toolName: FileTool;
  kind: 'read' | 'write';
}

/** One tool call, classified: a bash call or a file tool call, told apart by `toolName`. */
export type PermissionRequest = BashRequest | FileRequest;

export type PermissionVerdict = 'allow' | 'ask' | 'deny';

declare const commandKeyBrand: unique symbol;
declare const listedPrefixBrand: unique symbol;

/**
 * A bash command as an exact-grant key, normalized by the kit. Only the kit
 * makes one (a classified request's `command`, `grantFrom`,
 * `parseCommandPattern`, `parseGrantMatch`); on disk it is a plain string.
 */
export type CommandKey = string & { readonly [commandKeyBrand]: true };

/**
 * A prefix on the kit's table, written as a card writes it (`git status`,
 * `npm run test`). Only the kit makes one (a card's option,
 * `parseCommandPattern`, `parseGrantMatch`); on disk it is a plain string.
 */
export type ListedPrefix = string & { readonly [listedPrefixBrand]: true };

export type PathMatch = { type: 'path'; access: Access; pathPrefix: string };

/** A bash command, by its exact-grant key. */
export type CommandMatch = { type: 'command'; command: CommandKey };

/**
 * Bash commands by their leading words. Each prefix covers a part that
 * writes no file and starts with those words. A call is covered only when it
 * raises no signal and every part is covered.
 */
export type CommandPrefixMatch = { type: 'command-prefix'; prefixes: ListedPrefix[] };

/** What a grant matches. Never a tool name alone. */
export type GrantMatch = PathMatch | CommandMatch | CommandPrefixMatch;

/** The kind of a command rule: the leading words of a command, or one exact command. */
export type CommandRuleKind = 'prefix' | 'exact';

/**
 * A command grant as text, the way a card shows it and the Settings editor
 * takes it. A `prefix` rule's text is its prefixes, separated by commas
 * (`git status, npm run test`); an `exact` rule's text is the command as
 * written, `*` and commas kept (`rm *`).
 */
export interface CommandPattern {
  kind: CommandRuleKind;
  text: string;
}

/** A path grant's folder as text (`~/work/lib/`). */
export interface PathPattern {
  kind: 'path';
  text: string;
}

/** What a grant option shows of the rule it saves, told apart by `kind`. */
export type GrantPattern = CommandPattern | PathPattern;

/**
 * Something a host should say beside a rule, because the rule lets a call run
 * that the kit does not fully check. `script-unchecked`: the prefix runs a
 * script the kit never reads, which the agent may have changed: one by its
 * path (`node scripts/build.js`), a package script (`npm run build`), or the
 * project's tests (`npm test`).
 */
export type GrantCaveat = 'script-unchecked';

export type GrantScope = 'chat' | 'project';

export interface Grant {
  scope: GrantScope;
  match: GrantMatch;
  createdAt: string;
}

/** A scope the user can pick on an ASK, with the exact pattern it would save. */
export interface GrantOption {
  scope: GrantScope;
  /** What the option saves, in words: "Always allow commands that start with git status", "Always allow exactly: rm *". */
  label: string;
  /** The rule as text, with its kind: `{ kind: 'prefix', text: 'git status' }`, `{ kind: 'path', text: '~/work/lib/' }`. */
  pattern: GrantPattern;
  /** Set when the saved rule needs a caveat beside it; absent otherwise. */
  caveat?: GrantCaveat;
  match: GrantMatch;
}

/**
 * The decision for one call. It is self-contained: an `ask` carries the card
 * to show and the scopes the user may grant, so a host needs nothing else
 * from the engine to put the question in front of a person.
 */
export type PermissionDecision =
  | { decision: 'allow'; reason: string; request: PermissionRequest }
  | { decision: 'deny'; reason: string; request: PermissionRequest }
  | {
      decision: 'ask';
      reason: string;
      request: PermissionRequest;
      prompt: PermissionPrompt;
      /** The scopes the user may grant. Empty when a grant is not allowed. */
      grantOptions: GrantOption[];
    };

/** What a host puts in front of the user for one ASK (`ApprovalRequest.permission` in `@agentic-kit/harness`). */
export interface PermissionPrompt {
  title: string;
  summary: string;
  toolName: string;
  kind: RequestKind;
  command?: string;
  targets: { path: string; access: Access; zone: Zone }[];
  signals: Signal[];
  /** One plain sentence per signal, in order. */
  reasons: string[];
  grantOptions: Omit<GrantOption, 'match'>[];
}

/** The filesystem the engine needs. Injected so the pure modules stay testable. */
export interface FsProbe {
  /** Resolve symlinks; reject when the path does not exist. */
  realpath(path: string): Promise<string>;
  /** `true` when an entry exists at the path itself (a dangling link included). */
  lexists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  /** The entries of a directory. */
  readDir(path: string): Promise<DirEntry[]>;
  /** File size in bytes, so large files are skipped before they are read. */
  size(path: string): Promise<number>;
}

export interface DirEntry {
  name: string;
  kind: 'file' | 'dir' | 'symlink' | 'other';
}
