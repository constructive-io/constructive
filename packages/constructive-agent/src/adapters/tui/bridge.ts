import type { AgentRunEvent } from '../../types/events';

export interface TuiBridge {
  onEvent(event: AgentRunEvent): void;
  onError(error: Error): void;
}

export function publishToTui(
  bridge: TuiBridge,
  event: AgentRunEvent,
): void {
  try {
    bridge.onEvent(event);
  } catch (error) {
    bridge.onError(error as Error);
  }
}

export interface BufferedTuiBridge extends TuiBridge {
  getBuffer(): AgentRunEvent[];
  clearBuffer(): void;
}

export function createBufferedTuiBridge(
  handlers: Pick<TuiBridge, 'onEvent' | 'onError'>,
): BufferedTuiBridge {
  const buffer: AgentRunEvent[] = [];

  return {
    onEvent(event: AgentRunEvent): void {
      buffer.push(event);
      handlers.onEvent(event);
    },

    onError(error: Error): void {
      handlers.onError(error);
    },

    getBuffer(): AgentRunEvent[] {
      return buffer.slice();
    },

    clearBuffer(): void {
      buffer.length = 0;
    },
  };
}
