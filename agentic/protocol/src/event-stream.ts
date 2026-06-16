import type {
  AssistantMessage,
  AssistantMessageEvent,
  AssistantMessageEventStream,
} from './types.js';

export class EventStream<TEvent, TResult = TEvent> implements AsyncIterable<TEvent> {
  private readonly queue: TEvent[] = [];
  private readonly waiting: Array<(result: IteratorResult<TEvent>) => void> = [];
  private done = false;
  private readonly finalResultPromise: Promise<TResult>;
  private resolveFinalResult!: (value: TResult) => void;

  constructor(
    private readonly isTerminal: (event: TEvent) => boolean,
    private readonly extractResult: (event: TEvent) => TResult
  ) {
    this.finalResultPromise = new Promise<TResult>((resolve) => {
      this.resolveFinalResult = resolve;
    });
  }

  push(event: TEvent): void {
    if (this.done) {
      return;
    }

    if (this.isTerminal(event)) {
      this.done = true;
      this.resolveFinalResult(this.extractResult(event));
    }

    const waiter = this.waiting.shift();
    if (waiter) {
      waiter({ value: event, done: false });
      return;
    }

    this.queue.push(event);
  }

  end(result?: TResult): void {
    this.done = true;
    if (result !== undefined) {
      this.resolveFinalResult(result);
    }

    while (this.waiting.length > 0) {
      this.waiting.shift()!({ value: undefined as never, done: true });
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<TEvent> {
    while (true) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
        continue;
      }

      if (this.done) {
        return;
      }

      const next = await new Promise<IteratorResult<TEvent>>((resolve) => {
        this.waiting.push(resolve);
      });

      if (next.done) {
        return;
      }

      yield next.value;
    }
  }

  result(): Promise<TResult> {
    return this.finalResultPromise;
  }
}

export class DefaultAssistantMessageEventStream
  extends EventStream<AssistantMessageEvent, AssistantMessage>
  implements AssistantMessageEventStream
{
  constructor() {
    super(
      (event) => event.type === 'done' || event.type === 'error',
      (event) => {
        if (event.type === 'done') {
          return event.message;
        }

        if (event.type === 'error') {
          return event.error;
        }

        throw new Error('Unexpected terminal event');
      }
    );
  }
}

export function createAssistantMessageEventStream(): DefaultAssistantMessageEventStream {
  return new DefaultAssistantMessageEventStream();
}
