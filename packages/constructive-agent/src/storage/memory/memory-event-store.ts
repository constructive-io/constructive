import type { AgentRunEvent } from '../../types/events';
import type { EventStore } from '../interfaces';

export class MemoryEventStore implements EventStore {
  private eventsByRunId = new Map<string, AgentRunEvent[]>();

  async append(event: AgentRunEvent): Promise<void> {
    const events = this.eventsByRunId.get(event.runId) || [];
    events.push(event);
    this.eventsByRunId.set(event.runId, events);
  }

  async list(runId: string): Promise<AgentRunEvent[]> {
    return (this.eventsByRunId.get(runId) || []).slice();
  }

  async nextSeq(runId: string): Promise<number> {
    const events = this.eventsByRunId.get(runId) || [];
    return events.length + 1;
  }
}
