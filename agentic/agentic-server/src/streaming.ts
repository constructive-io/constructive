/**
 * Server-sent-event passthrough for streaming chat completions.
 *
 * The gateway relays an OpenAI-compatible `text/event-stream` body verbatim so
 * clients receive tokens as the provider emits them, while scanning the frames
 * for the terminal usage object that metering needs.
 */

import type { UsageResult } from './types';

/** Accumulates SSE frames, exposing the last usage object the stream carried. */
export class UsageScanner {
  private buffer = '';
  private usage: UsageResult | undefined;

  /** Feed one decoded chunk of the event stream. */
  push(chunk: string): void {
    this.buffer += chunk;

    const frames = this.buffer.split('\n');
    this.buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;

      const payload = line.slice('data:'.length).trim();
      if (payload === '' || payload === '[DONE]') continue;

      let parsed: { usage?: Partial<UsageResult> | null };
      try {
        parsed = JSON.parse(payload);
      } catch {
        // A provider frame the gateway cannot parse carries no usage it could
        // report; relaying is the router's job and happens regardless.
        continue;
      }

      const usage = parsed.usage;
      if (!usage) continue;

      this.usage = {
        prompt_tokens: usage.prompt_tokens ?? 0,
        completion_tokens: usage.completion_tokens ?? 0,
        total_tokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0)
      };
    }
  }

  /** The last usage object seen, or undefined when the provider sent none. */
  result(): UsageResult | undefined {
    return this.usage;
  }
}

/**
 * Relay an upstream event-stream response to the client byte for byte and
 * answer the usage its final frame carried, or undefined when it carried none.
 *
 * @param upstream - the provider response whose body is being relayed.
 * @param res - the client response the frames are written to.
 * @returns the usage the stream reported, if any.
 */
export async function relayEventStream(
  upstream: { body: ReadableStream<Uint8Array> | null; headers: { get(name: string): string | null } },
  res: {
    setHeader(name: string, value: string): void;
    flushHeaders?(): void;
    write(chunk: string): void;
    end(): void;
  }
): Promise<UsageResult | undefined> {
  res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const scanner = new UsageScanner();

  if (upstream.body) {
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      scanner.push(text);
      res.write(text);
    }
  }

  res.end();
  return scanner.result();
}

/**
 * Ask an OpenAI-compatible provider to include usage in its final frame.
 * Callers that already set `stream_options` keep their own choice.
 */
export function withUsageStreamOptions(
  body: Record<string, unknown>
): Record<string, unknown> {
  if (body.stream_options !== undefined) return body;
  return { ...body, stream_options: { include_usage: true } };
}
