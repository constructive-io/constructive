import assert from 'node:assert/strict';

import {
  QueryClient,
  QueryClientProvider,
  notifyManager,
} from '@tanstack/react-query';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

type WaitForOptions = {
  timeoutMs?: number;
  intervalMs?: number;
};

export interface HookHarness<TResult> {
  getResult: () => TResult;
  waitFor: (predicate: (result: TResult) => boolean, options?: WaitForOptions) => Promise<TResult>;
  unmount: () => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_INTERVAL_MS = 30;
let reactQueryActBridgeConfigured = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function renderHookWithClient<TResult>(
  useHook: () => TResult,
  queryClient: QueryClient
): Promise<HookHarness<TResult>> {
  // Enables React's act() environment checks for non-Jest runtimes.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (!reactQueryActBridgeConfigured) {
    notifyManager.setNotifyFunction((callback) => {
      act(() => {
        callback();
      });
    });
    reactQueryActBridgeConfigured = true;
  }

  let renderer: ReactTestRenderer | null = null;
  let latestResult: TResult | undefined;

  function Probe() {
    latestResult = useHook();
    return null;
  }

  await act(async () => {
    renderer = create(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(Probe, null)
      )
    );
  });

  return {
    getResult() {
      assert.notEqual(latestResult, undefined, 'Hook result is not ready yet');
      return latestResult;
    },

    async waitFor(predicate, options) {
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
      const start = Date.now();

      while (Date.now() - start < timeoutMs) {
        const result = this.getResult();
        if (predicate(result)) {
          return result;
        }
        await act(async () => {
          await sleep(intervalMs);
        });
      }

      throw new Error(`Timed out waiting for hook condition after ${timeoutMs}ms`);
    },

    async unmount() {
      if (!renderer) {
        return;
      }
      await act(async () => {
        renderer?.unmount();
      });
    },
  };
}
