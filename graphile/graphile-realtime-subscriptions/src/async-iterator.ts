export function filterMapIterator<T, U>(source: AsyncIterable<T>, transform: (value: T) => U | null): AsyncGenerator<U, void, void> {
  const iterator = source[Symbol.asyncIterator]();
  let closed = false;
  return {
    [Symbol.asyncIterator]() { return this; },
    async [Symbol.asyncDispose]() { await this.return(); },
    async next() {
      try {
        while (!closed) {
          const result = await iterator.next();
          if (closed || result.done) break;
          const value = transform(result.value);
          if (value !== null) return { done: false, value };
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
