import { AsyncLocalStorage } from 'node:async_hooks';

import { withLogsSuppressed } from '@pgpmjs/logger';

const consoleMethods = ['debug', 'error', 'info', 'log', 'warn'] as const;
type ConsoleMethod = (typeof consoleMethods)[number];

const suppression = new AsyncLocalStorage<boolean>();
let users = 0;
let originalMethods: Record<ConsoleMethod, typeof console.log> | undefined;

const install = (): void => {
  if (originalMethods !== undefined) return;
  originalMethods = Object.fromEntries(
    consoleMethods.map((method) => [method, console[method]])
  ) as Record<ConsoleMethod, typeof console.log>;
  for (const method of consoleMethods) {
    console[method] = ((...args: unknown[]): void => {
      if (suppression.getStore() === true) return;
      originalMethods?.[method].apply(console, args as never);
    }) as never;
  }
};

const uninstall = (): void => {
  if (originalMethods === undefined) return;
  for (const method of consoleMethods) {
    console[method] = originalMethods[method] as never;
  }
  originalMethods = undefined;
};

/** Suppress dependency console output only within the current async context. */
export const withConsoleSuppressed = async <T>(
  callback: () => Promise<T>
): Promise<T> => {
  users += 1;
  install();
  try {
    return await suppression.run(true, callback);
  } finally {
    users -= 1;
    if (users === 0) uninstall();
  }
};

/** Suppress dependency loggers and console output within one operation. */
export const withOperationOutputSuppressed = <T>(
  callback: () => Promise<T>
): Promise<T> => withLogsSuppressed(() => withConsoleSuppressed(callback));
