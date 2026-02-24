import type { AgentRunRecord } from '../../types/run-state';
import type { RunStore } from '../interfaces';

export class MemoryRunStore implements RunStore {
  private runs = new Map<string, AgentRunRecord>();

  async create(run: AgentRunRecord): Promise<void> {
    this.runs.set(run.id, { ...run });
  }

  async get(runId: string): Promise<AgentRunRecord | null> {
    const run = this.runs.get(runId);
    return run ? { ...run } : null;
  }

  async update(
    runId: string,
    patch: Partial<AgentRunRecord>,
  ): Promise<AgentRunRecord> {
    const existing = this.runs.get(runId);

    if (!existing) {
      throw new Error(`Run ${runId} not found`);
    }

    const updated = {
      ...existing,
      ...patch,
    };

    this.runs.set(runId, updated);
    return { ...updated };
  }
}
