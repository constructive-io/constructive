import type { AgentEvent } from './types.js';

export type RunChannelPush = (event: AgentEvent) => Promise<void>;

export type AgentRunBinder = (
  push: RunChannelPush | null,
  signal: AbortSignal
) => Promise<void>;

export interface AgentRunHandle extends PromiseLike<void> {
  events(): AsyncIterable<AgentEvent>;
  toReadableStream(): ReadableStream<AgentEvent>;
  toResponse(init?: ResponseInit): Response;
  /**
   * Run to completion without observing events. Equivalent to `await handle`
   * (the handle is `PromiseLike<void>`), but explicit. Use this if you want
   * to avoid accidental thenable assimilation in code paths where the handle
   * might be passed through generic wrappers.
   */
  wait(): Promise<void>;
}

const DEFAULT_HIGH_WATER_MARK = 8;

export interface AgentRunHandleOptions {
  highWaterMark?: number;
}

export class DefaultAgentRunHandle implements AgentRunHandle {
  private startedAs: 'events' | 'stream' | 'response' | 'sink' | null = null;
  private completion: Promise<void> | null = null;
  private readonly highWaterMark: number;

  constructor(
    private readonly bind: AgentRunBinder,
    options: AgentRunHandleOptions = {}
  ) {
    this.highWaterMark = options.highWaterMark ?? DEFAULT_HIGH_WATER_MARK;
  }

  events(): AsyncIterable<AgentEvent> {
    const stream = this.startStream('events');
    return readableStreamToAsyncIterable(stream);
  }

  toReadableStream(): ReadableStream<AgentEvent> {
    return this.startStream('stream');
  }

  toResponse(init?: ResponseInit): Response {
    const stream = this.startStream('response');
    const sse = stream.pipeThrough(createSSETransform());

    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'text/event-stream');
    }
    if (!headers.has('Cache-Control')) {
      headers.set('Cache-Control', 'no-cache, no-transform');
    }
    if (!headers.has('Connection')) {
      headers.set('Connection', 'keep-alive');
    }

    const responseInit: ResponseInit = { ...init, headers };
    return new Response(sse, responseInit);
  }

  wait(): Promise<void> {
    if (!this.startedAs) {
      this.startSink();
    }
    return this.completion!;
  }

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.wait().then(onfulfilled, onrejected);
  }

  private ensureNotStarted(via: NonNullable<DefaultAgentRunHandle['startedAs']>): void {
    if (this.startedAs && this.startedAs !== via) {
      throw new Error(
        `AgentRunHandle already consumed via ${this.startedAs}; cannot also call ${via}()`
      );
    }
    if (this.startedAs === via) {
      throw new Error(`AgentRunHandle already consumed via ${via}()`);
    }
  }

  private startStream(via: 'events' | 'stream' | 'response'): ReadableStream<AgentEvent> {
    this.ensureNotStarted(via);
    this.startedAs = via;

    const abortController = new AbortController();
    let cancelled = false;
    const pullWaiters = new Set<() => void>();

    const releasePullWaiters = () => {
      if (pullWaiters.size === 0) {
        return;
      }
      const waiters = Array.from(pullWaiters);
      pullWaiters.clear();
      for (const resolve of waiters) {
        resolve();
      }
    };

    let runPromise: Promise<void>;

    const stream = new ReadableStream<AgentEvent>(
      {
        start: (controller) => {
          const push: RunChannelPush = async (event) => {
            if (cancelled) {
              return;
            }
            try {
              controller.enqueue(event);
            } catch {
              cancelled = true;
              return;
            }
            while (!cancelled && (controller.desiredSize ?? 1) <= 0) {
              await new Promise<void>((resolve) => {
                pullWaiters.add(resolve);
              });
            }
          };

          runPromise = (async () => {
            try {
              await this.bind(push, abortController.signal);
              if (!cancelled) {
                try {
                  controller.close();
                } catch {
                  // already closed
                }
              }
            } catch (err) {
              if (!cancelled) {
                try {
                  controller.error(err);
                } catch {
                  // already closed
                }
              }
              throw err;
            }
          })();

          this.completion = runPromise;
          this.completion.catch(() => {});
        },
        pull: () => {
          releasePullWaiters();
        },
        cancel: () => {
          cancelled = true;
          abortController.abort();
          releasePullWaiters();
        },
      },
      { highWaterMark: this.highWaterMark }
    );

    return stream;
  }

  private startSink(): void {
    this.ensureNotStarted('sink');
    this.startedAs = 'sink';

    const abortController = new AbortController();
    this.completion = this.bind(null, abortController.signal);
    this.completion.catch(() => {});
  }
}

async function* readableStreamToAsyncIterable<T>(
  stream: ReadableStream<T>
): AsyncIterableIterator<T> {
  const reader = stream.getReader();
  let drained = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        drained = true;
        return;
      }
      yield value;
    }
  } finally {
    if (!drained) {
      try {
        await reader.cancel();
      } catch {
        // cancel can reject if the stream already errored — safe to ignore
      }
    }
    reader.releaseLock();
  }
}

function createSSETransform(): TransformStream<AgentEvent, Uint8Array> {
  const encoder = new TextEncoder();
  return new TransformStream<AgentEvent, Uint8Array>({
    transform(event, controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    },
  });
}
