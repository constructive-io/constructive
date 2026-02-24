import { RunController } from '../../src/runtime/run-controller';
import { MemoryEventStore } from '../../src/storage/memory/memory-event-store';
import { MemoryRunStore } from '../../src/storage/memory/memory-run-store';

describe('RunController', () => {
  it('starts and completes a run with event journal entries', async () => {
    const runStore = new MemoryRunStore();
    const eventStore = new MemoryEventStore();
    const controller = new RunController(runStore, eventStore);

    const run = await controller.startRun({
      actorId: 'actor-1',
      tenantId: 'tenant-1',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
    });

    expect(run.status).toBe('running');

    const completed = await controller.transitionStatus(run.id, 'completed');

    expect(completed.status).toBe('completed');
    expect(completed.endedAt).toBeDefined();

    const events = await controller.getEvents(run.id);
    expect(events.map((event) => event.type)).toEqual([
      'run_start',
      'run_status_changed',
      'run_status_changed',
      'run_end',
    ]);
  });

  it('records run errors', async () => {
    const runStore = new MemoryRunStore();
    const eventStore = new MemoryEventStore();
    const controller = new RunController(runStore, eventStore);

    const run = await controller.startRun({
      actorId: 'actor-2',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
    });

    const failed = await controller.recordError(
      run.id,
      'TEST_ERROR',
      'Something failed',
    );

    expect(failed.status).toBe('failed');
    expect(failed.errorCode).toBe('TEST_ERROR');
    expect(failed.errorMessage).toBe('Something failed');

    const events = await controller.getEvents(run.id);
    expect(events.map((event) => event.type)).toEqual([
      'run_start',
      'run_status_changed',
      'run_error',
      'run_status_changed',
      'run_end',
    ]);
  });

  it('allocates unique monotonic sequence numbers under concurrent emit calls', async () => {
    const runStore = new MemoryRunStore();
    const eventStore = new MemoryEventStore();
    const controller = new RunController(runStore, eventStore);

    const run = await controller.startRun({
      actorId: 'actor-3',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
    });

    const updates = Array.from({ length: 20 }, (_, index) =>
      controller.appendEvent(run.id, 'tool_call_update', {
        index,
      }),
    );

    await Promise.all(updates);

    const events = await controller.getEvents(run.id);
    const seqs = events.map((event) => event.seq);
    const sorted = [...seqs].sort((a, b) => a - b);

    expect(new Set(seqs).size).toBe(seqs.length);
    expect(seqs).toEqual(sorted);
    expect(seqs[0]).toBe(1);
    expect(seqs[seqs.length - 1]).toBe(seqs.length);
  });
});
