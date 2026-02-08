/**
 * Debounce utility for regeneration
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>): void => {
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (lastArgs) {
        func(...lastArgs);
        lastArgs = null;
      }
    }, wait);
  };

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debounced.flush = (): void => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      timeoutId = null;
      func(...lastArgs);
      lastArgs = null;
    }
  };

  return debounced;
}

/**
 * Creates an async debounced function
 */
export function debounceAsync<
  T extends (...args: unknown[]) => Promise<unknown>,
>(
  func: T,
  wait: number,
): {
  (...args: Parameters<T>): Promise<void>;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<void> | null = null;
  let pendingResolve: (() => void) | null = null;

  const debounced = (...args: Parameters<T>): Promise<void> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // If there's already a pending promise, reuse it
    if (!pendingPromise) {
      pendingPromise = new Promise((resolve) => {
        pendingResolve = resolve;
      });
    }

    timeoutId = setTimeout(async () => {
      timeoutId = null;
      try {
        await func(...args);
      } finally {
        if (pendingResolve) {
          pendingResolve();
          pendingResolve = null;
          pendingPromise = null;
        }
      }
    }, wait);

    return pendingPromise;
  };

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pendingResolve) {
      pendingResolve();
      pendingResolve = null;
      pendingPromise = null;
    }
  };

  return debounced;
}
