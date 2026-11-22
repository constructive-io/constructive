import type { GrafastSubscriber } from 'grafast';
import type { Pool, PoolClient } from 'pg';
import { PgSubscriber } from 'postgraphile/adaptors/pg';

type ClientEvent = Parameters<PoolClient['on']>[0];

function subscriberPool(pool: Pool): Pool {
  return new Proxy(pool, {
    get(target, property) {
      if (property === 'connect') {
        return async () => {
          const client = await target.connect();
          const listeners: Array<[ClientEvent, (...args: any[]) => void]> = [];
          const scopedClient: PoolClient = new Proxy(client, {
            get(target, property) {
              if (property === 'on' || property === 'addListener') {
                return (event: ClientEvent, listener: (...args: any[]) => void) => {
                  listeners.push([event, listener]);
                  target.on(event, listener);
                  return scopedClient;
                };
              }
              if (property === 'release') {
                return (...args: Parameters<PoolClient['release']>) => {
                  for (const [event, listener] of listeners) target.removeListener(event, listener);
                  listeners.length = 0;
                  target.release(...args);
                };
              }
              const value = Reflect.get(target, property, target);
              return typeof value === 'function' ? value.bind(target) : value;
            }
          });
          return scopedClient;
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

export class IdleReleasingPgSubscriber implements GrafastSubscriber<Record<string, string>> {
  private current: PgSubscriber | null = null;
  private subscriptions = 0;
  private closed = false;

  readonly eventEmitter = {
    emit: (event: string, payload: string): boolean => {
      const subscriber = this.current as unknown as {
        eventEmitter: { emit(event: string, payload: string): boolean };
      } | null;
      return subscriber?.eventEmitter.emit(event, payload) ?? false;
    }
  };

  constructor(private readonly pool: Pool) {}

  subscribe(topic: string): AsyncIterableIterator<string> {
    if (this.closed) throw new Error('PgSubscriber is released');
    const subscriber = this.current ??= new PgSubscriber(subscriberPool(this.pool));
    const source = subscriber.subscribe(topic);
    this.subscriptions++;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.subscriptions--;
      if (this.subscriptions === 0 && this.current === subscriber) {
        this.current = null;
        subscriber.release();
      }
    };

    return {
      async next() {
        try {
          const result = await source.next();
          if (result.done) finish();
          return result;
        } catch (error) {
          finish();
          throw error;
        }
      },
      async return(value) {
        try {
          return await source.return!(value);
        } finally {
          finish();
        }
      },
      async throw(error) {
        try {
          return await source.throw!(error);
        } finally {
          finish();
        }
      },
      [Symbol.asyncIterator]() { return this; }
    };
  }

  release(): void {
    this.closed = true;
    this.current?.release();
    this.current = null;
  }
}
