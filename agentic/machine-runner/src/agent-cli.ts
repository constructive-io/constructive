import type { AgentEvent } from '@constructive-db/machine-protocol';
import path from 'path';

export type { AgentEvent };

export interface AgentCliSpawn {
  command: string;
  args: string[];
  stdinPrompt?: string;
}

export interface AgentCliAdapter {
  readonly name: 'claude' | 'codex';
  spawnArgs(prompt: string, resume?: string): AgentCliSpawn;
  parseEvent(line: string): AgentEvent[] | null;
  encodeApproval?(requestId: string, decision: 'allow' | 'deny', reason?: string): string;
  encodeTurn?(prompt: string): string;
}

function jsonObject(line: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(line);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export class ClaudeCodeAdapter implements AgentCliAdapter {
  readonly name = 'claude' as const;

  constructor(readonly extraArgs: string[] = []) {}

  spawnArgs(prompt: string, resume?: string): AgentCliSpawn {
    return {
      command: 'claude',
      args: [
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--input-format',
        'stream-json',
        '--permission-prompt-tool',
        'stdio',
        ...(resume ? ['--resume', resume] : []),
        ...this.extraArgs
      ],
      stdinPrompt: this.encodeTurn(prompt)
    };
  }

  encodeTurn(prompt: string): string {
    return (
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: [{ type: 'text', text: prompt }] }
      }) + '\n'
    );
  }

  encodeApproval(requestId: string, decision: 'allow' | 'deny', reason?: string): string {
    return (
      JSON.stringify({
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: requestId,
          response:
            decision === 'allow'
              ? { behavior: 'allow' }
              : { behavior: 'deny', message: reason ?? 'denied' }
        }
      }) + '\n'
    );
  }

  parseEvent(line: string): AgentEvent[] | null {
    if (line.length === 0) return null;
    const value = jsonObject(line);
    const type = stringValue(value.type);
    if (type === 'system' || type === 'init') {
      if (value.subtype === 'init' || type === 'init') {
        const cliSessionId = stringValue(value.session_id);
        return cliSessionId ? [{ kind: 'session', cliSessionId }] : null;
      }
      return null;
    }
    if (type === 'assistant') {
      const message =
        typeof value.message === 'object' && value.message !== null
          ? (value.message as Record<string, unknown>)
          : null;
      const content = Array.isArray(message?.content) ? message.content : [];
      const events: AgentEvent[] = [];
      for (const block of content) {
        if (typeof block !== 'object' || block === null) continue;
        const item = block as Record<string, unknown>;
        if (item.type === 'text' && typeof item.text === 'string') {
          events.push({ kind: 'text', text: item.text });
        } else if (
          item.type === 'tool_use' &&
          typeof item.id === 'string' &&
          typeof item.name === 'string'
        ) {
          events.push({ kind: 'tool_call', id: item.id, name: item.name, input: item.input });
        }
      }
      return events.length > 0 ? events : null;
    }
    if (type === 'user') {
      const message =
        typeof value.message === 'object' && value.message !== null
          ? (value.message as Record<string, unknown>)
          : null;
      const content = Array.isArray(message?.content) ? message.content : [];
      const events: AgentEvent[] = [];
      for (const block of content) {
        if (typeof block !== 'object' || block === null) continue;
        const item = block as Record<string, unknown>;
        if (item.type === 'tool_result' && typeof item.tool_use_id === 'string') {
          events.push({
            kind: 'tool_result',
            id: item.tool_use_id,
            output: item.content,
            ...(item.is_error === true ? { isError: true } : {})
          });
        }
      }
      return events.length > 0 ? events : null;
    }
    if (type === 'control_request') {
      const request =
        typeof value.request === 'object' && value.request !== null
          ? (value.request as Record<string, unknown>)
          : null;
      if (
        (value.subtype === 'can_use_tool' || request?.subtype === 'can_use_tool') &&
        typeof value.request_id === 'string' &&
        typeof request?.tool_name === 'string'
      ) {
        return [
          {
            kind: 'approval_requested',
            requestId: value.request_id,
            tool: request.tool_name,
            input: request.input,
            ...(typeof request.decision_reason === 'string'
              ? { reason: request.decision_reason }
              : {})
          }
        ];
      }
      return null;
    }
    if (type === 'result') {
      return [
        {
          kind: 'result',
          ok: value.is_error !== true && value.subtype === 'success',
          ...(typeof value.result === 'string' ? { summary: value.result } : {}),
          ...(value.usage !== undefined ? { usage: value.usage } : {}),
          ...(typeof value.total_cost_usd === 'number' ? { costUsd: value.total_cost_usd } : {})
        }
      ];
    }
    return null;
  }
}

export class CodexExecAdapter implements AgentCliAdapter {
  readonly name = 'codex' as const;

  constructor(readonly extraArgs: string[] = []) {}

  spawnArgs(prompt: string, resume?: string): AgentCliSpawn {
    return {
      command: 'codex',
      args: ['exec', '--json', ...this.extraArgs, ...(resume ? ['resume', resume] : []), prompt]
    };
  }

  parseEvent(line: string): AgentEvent[] | null {
    if (line.length === 0) return null;
    const value = jsonObject(line);
    const type = stringValue(value.type);
    if (type === 'thread.started' && typeof value.thread_id === 'string') {
      return [{ kind: 'session', cliSessionId: value.thread_id }];
    }
    if (type === 'error' && typeof value.message === 'string') {
      return [{ kind: 'result', ok: false, summary: value.message }];
    }
    if (type === 'turn.completed') {
      return [
        {
          kind: 'result',
          ok: true,
          ...(value.usage !== undefined ? { usage: value.usage } : {})
        }
      ];
    }
    if (type === 'turn.failed') {
      const error =
        typeof value.error === 'object' && value.error !== null
          ? (value.error as Record<string, unknown>)
          : null;
      return [
        {
          kind: 'result',
          ok: false,
          ...(typeof error?.message === 'string' ? { summary: error.message } : {})
        }
      ];
    }
    if (type !== 'item.completed') return null;
    const item =
      typeof value.item === 'object' && value.item !== null
        ? (value.item as Record<string, unknown>)
        : null;
    if (!item || typeof item.id !== 'string') return null;
    if (item.type === 'agent_message' && typeof item.text === 'string') {
      return [{ kind: 'text', text: item.text }];
    }
    if (item.type === 'error' && typeof item.message === 'string') {
      return [{ kind: 'tool_result', id: item.id, output: item.message, isError: true }];
    }
    if (item.type === 'command_execution') {
      const command = item.command;
      return [
        { kind: 'tool_call', id: item.id, name: 'command_execution', input: { command } },
        {
          kind: 'tool_result',
          id: item.id,
          output: item.aggregated_output,
          ...(item.exit_code !== 0 ? { isError: true } : {})
        }
      ];
    }
    return null;
  }
}

export function adapterForCommand(command: string, extraArgs: string[]): AgentCliAdapter {
  switch (path.basename(command)) {
  case 'claude':
    return new ClaudeCodeAdapter(extraArgs);
  case 'codex':
    return new CodexExecAdapter(extraArgs);
  default:
    throw new Error(`machine-runner: no CLI adapter for command '${command}'`);
  }
}
