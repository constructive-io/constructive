import type { AgentRunEvent } from '../../types/events';

export interface WebBridgePublisher {
  publish(event: AgentRunEvent): Promise<void>;
}

export interface WebBridgeSubscriber {
  subscribe(runId: string, onEvent: (event: AgentRunEvent) => void): () => void;
  subscribeAll(onEvent: (event: AgentRunEvent) => void): () => void;
}

type Listener = (event: AgentRunEvent) => void;

export class InMemoryWebBridge implements WebBridgePublisher, WebBridgeSubscriber {
  private listenersByRun = new Map<string, Set<Listener>>();
  private allListeners = new Set<Listener>();

  async publish(event: AgentRunEvent): Promise<void> {
    const listeners = this.listenersByRun.get(event.runId);

    if (listeners && listeners.size > 0) {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch {
          // Best-effort fan-out; one subscriber should not block others.
        }
      }
    }

    if (this.allListeners.size > 0) {
      for (const listener of [...this.allListeners]) {
        try {
          listener(event);
        } catch {
          // Best-effort fan-out; one subscriber should not block others.
        }
      }
    }
  }

  subscribe(runId: string, onEvent: (event: AgentRunEvent) => void): () => void {
    const listeners = this.listenersByRun.get(runId) || new Set<Listener>();
    listeners.add(onEvent);
    this.listenersByRun.set(runId, listeners);

    return () => {
      const current = this.listenersByRun.get(runId);
      if (!current) {
        return;
      }

      current.delete(onEvent);
      if (current.size === 0) {
        this.listenersByRun.delete(runId);
      }
    };
  }

  subscribeAll(onEvent: (event: AgentRunEvent) => void): () => void {
    this.allListeners.add(onEvent);

    return () => {
      this.allListeners.delete(onEvent);
    };
  }
}
