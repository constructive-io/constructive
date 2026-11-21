export function filterMapIterator<T, U>(source: AsyncIterable<T>, transform: (value: T) => U | null): AsyncGenerator<U, void, void> {
  return flatMapIterator(source, value => {
    const result = transform(value);
    return result === null ? [] : [result];
  });
}

export function flatMapIterator<T, U>(source: AsyncIterable<T>, transform: (value: T) => readonly U[]): AsyncGenerator<U, void, void> {
  const iterator = source[Symbol.asyncIterator]();
  let closed = false;
  let pending: readonly U[] = [];
  let index = 0;
  return {
    [Symbol.asyncIterator]() { return this; },
    async [Symbol.asyncDispose]() { await this.return(); },
    async next() {
      try {
        while (!closed) {
          if (index < pending.length) return { done: false, value: pending[index++] };
          const result = await iterator.next();
          if (closed || result.done) break;
          pending = transform(result.value);
          index = 0;
        }
        closed = true;
        return { done: true, value: undefined };
      } catch (error) {
        closed = true;
        await iterator.return?.();
        throw error;
      }
    },
    async return() {
      if (!closed) {
        closed = true;
        await iterator.return?.();
      }
      return { done: true, value: undefined };
    },
    async throw(error: unknown) {
      if (!closed) {
        closed = true;
        await iterator.return?.();
      }
      throw error;
    }
  };
}
