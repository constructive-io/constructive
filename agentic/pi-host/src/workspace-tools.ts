// The coding lane's tools: a workspace, as tools.
//
// The pi control-plane tools (`@agentic-kit/pi`) are the *schema* lane — they
// resolve a Constructive project from the cwd and edit a tenant's database. A
// coding run's cwd is a git clone, so those tools have no project to act on;
// what it needs instead is the file surface of the checkout. pi's own
// read/write/edit/bash tools live inside the pi coding agent's TUI runtime
// rather than as `AgentTool`s an embedder can hand to `Agent`, so the four here
// are that surface and nothing more.
//
// Every path is resolved inside the workspace: a model that asks for
// `../../etc/passwd` gets an error result rather than the file, because the
// clone is the boundary the Job was given.

import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { AgentTool, AgentToolResult } from '@agentic-kit/agent';

import { isInside } from './project-context';

export const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
export const MAX_READ_BYTES = 200_000;

export interface WorkspaceToolsOptions {
  /** The clone the run edits. Every tool is relative to it. */
  cwd: string;
  /** Wall-clock cap for `run_command`. */
  commandTimeoutMs?: number;
  /** Environment `run_command` runs with. Defaults to the Job's, minus nothing. */
  env?: NodeJS.ProcessEnv;
}

export class OutsideWorkspaceError extends Error {
  constructor(readonly requested: string, readonly cwd: string) {
    super(`'${requested}' is outside the workspace (${cwd})`);
    this.name = 'OutsideWorkspaceError';
  }
}

function resolveInside(cwd: string, requested: string): string {
  const resolved = path.resolve(cwd, requested);
  if (!isInside(cwd, resolved)) throw new OutsideWorkspaceError(requested, cwd);
  return resolved;
}

function text(value: string): AgentToolResult {
  return { content: [{ type: 'text', text: value }] };
}

function failure(error: unknown): AgentToolResult {
  return text(`error: ${error instanceof Error ? error.message : String(error)}`);
}

async function attempt(run: () => Promise<AgentToolResult>): Promise<AgentToolResult> {
  try {
    return await run();
  } catch (error) {
    // A tool failure is the model's to recover from — a bad path or a failing
    // command is an ordinary result it should read and retry, not a crashed
    // run. Anything that must end the run (a gateway that cannot be reached,
    // a thread that is gone) is raised outside a tool.
    return failure(error);
  }
}

interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number;
}

function runCommand(
  command: string,
  options: Required<Pick<WorkspaceToolsOptions, 'cwd'>> & {
    timeoutMs: number;
    env?: NodeJS.ProcessEnv;
  }
): Promise<CommandOutput> {
  return new Promise((resolve) => {
    execFile(
      '/bin/sh',
      ['-c', command],
      {
        cwd: options.cwd,
        timeout: options.timeoutMs,
        maxBuffer: MAX_READ_BYTES,
        ...(options.env ? { env: options.env } : {})
      },
      (error, stdout, stderr) => {
        const code =
          error && typeof (error as { code?: unknown }).code === 'number'
            ? (error as { code: number }).code
            : error
              ? 1
              : 0;
        resolve({ stdout, stderr: stderr + (error && !stderr ? String(error.message) : ''), code });
      }
    );
  });
}

/**
 * Read, write, edit, list, run. Named the way pi names them so a persona's
 * tool allowlist reads the same in either host.
 */
export function createWorkspaceTools(options: WorkspaceToolsOptions): AgentTool[] {
  const cwd = path.resolve(options.cwd);
  const timeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;

  return [
    {
      name: 'read_file',
      label: 'Read a file',
      description: 'Read a UTF-8 file from the workspace, relative to its root.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Path relative to the workspace root' } },
        required: ['path'],
        additionalProperties: false
      },
      execute: (_id, params) =>
        attempt(async () => {
          const file = resolveInside(cwd, String(params.path));
          const info = await stat(file);
          if (info.size > MAX_READ_BYTES) {
            return text(`error: ${params.path} is ${info.size} bytes — too large to read whole`);
          }
          return text(await readFile(file, 'utf-8'));
        })
    },
    {
      name: 'write_file',
      label: 'Write a file',
      description:
        'Write a UTF-8 file in the workspace, creating parent directories. Replaces the whole file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path relative to the workspace root' },
          content: { type: 'string', description: 'The file\'s new contents' }
        },
        required: ['path', 'content'],
        additionalProperties: false
      },
      execute: (_id, params) =>
        attempt(async () => {
          const file = resolveInside(cwd, String(params.path));
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, String(params.content), 'utf-8');
          return text(`wrote ${params.path}`);
        })
    },
    {
      name: 'edit_file',
      label: 'Edit a file',
      description:
        'Replace an exact string in a file. The string must occur exactly once, so an ambiguous edit fails rather than guessing.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path relative to the workspace root' },
          old_string: { type: 'string', description: 'The text to replace' },
          new_string: { type: 'string', description: 'What to replace it with' }
        },
        required: ['path', 'old_string', 'new_string'],
        additionalProperties: false
      },
      execute: (_id, params) =>
        attempt(async () => {
          const file = resolveInside(cwd, String(params.path));
          const before = await readFile(file, 'utf-8');
          const target = String(params.old_string);
          const occurrences = before.split(target).length - 1;
          if (occurrences === 0) return text(`error: ${params.path} does not contain that text`);
          if (occurrences > 1) {
            return text(
              `error: that text occurs ${occurrences} times in ${params.path} — include enough context to make it unique`
            );
          }
          await writeFile(file, before.replace(target, String(params.new_string)), 'utf-8');
          return text(`edited ${params.path}`);
        })
    },
    {
      name: 'list_files',
      label: 'List files',
      description: 'List the entries of a directory in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory relative to the workspace root' }
        },
        additionalProperties: false
      },
      execute: (_id, params) =>
        attempt(async () => {
          const dir = resolveInside(cwd, params.path === undefined ? '.' : String(params.path));
          const entries = await readdir(dir, { withFileTypes: true });
          const listed = entries
            .filter((entry) => entry.name !== '.git')
            .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
            .sort();
          return text(listed.join('\n') || '(empty)');
        })
    },
    {
      name: 'run_command',
      label: 'Run a command',
      description:
        'Run a shell command in the workspace root and answer with its output and exit status.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'The command line to run' } },
        required: ['command'],
        additionalProperties: false
      },
      execute: (_id, params) =>
        attempt(async () => {
          const result = await runCommand(String(params.command), {
            cwd,
            timeoutMs,
            ...(options.env ? { env: options.env } : {})
          });
          const parts = [
            result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : '',
            result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : '',
            `exit: ${result.code}`
          ].filter(Boolean);
          return text(parts.join('\n\n'));
        })
    }
  ];
}

export const WORKSPACE_TOOL_NAMES = [
  'read_file',
  'write_file',
  'edit_file',
  'list_files',
  'run_command'
] as const;
