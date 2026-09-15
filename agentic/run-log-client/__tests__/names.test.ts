import { runLogNames } from '../src/names';

describe('runLogNames', () => {
  it('derives the app-scope names from the default tables', () => {
    expect(runLogNames()).toEqual({
      runTable: 'agent_run',
      eventTable: 'agent_event',
      threadTable: 'agent_thread',
      run: 'agentRun',
      event: 'agentEvent',
      thread: 'agentThread',
      runs: 'agentRuns',
      events: 'agentEvents',
      threads: 'agentThreads',
      runType: 'AgentRun',
      eventType: 'AgentEvent',
      threadType: 'AgentThread',
      createEvent: 'createAgentEvent',
      createRun: 'createAgentRun',
      createThread: 'createAgentThread',
      updateRun: 'updateAgentRun',
      runPatch: 'agentRunPatch',
    });
  });

  it('follows the module to another scope', () => {
    const names = runLogNames(
      'org_agent_run',
      'org_agent_event',
      'org_agent_thread'
    );
    expect(names.runs).toBe('orgAgentRuns');
    expect(names.createThread).toBe('createOrgAgentThread');
    expect(names.createEvent).toBe('createOrgAgentEvent');
    expect(names.updateRun).toBe('updateOrgAgentRun');
    expect(names.runPatch).toBe('orgAgentRunPatch');
  });

  it('pluralises the endings a generated table name can have', () => {
    expect(runLogNames('agent_run', 'agent_patch').events).toBe('agentPatches');
    expect(runLogNames('agent_run', 'agent_entry').events).toBe('agentEntries');
    expect(runLogNames('agent_run', 'agent_status').events).toBe(
      'agentStatuses'
    );
  });

  it('refuses a module with no run surface', () => {
    expect(() => runLogNames('', 'agent_event')).toThrow(
      /run, event and thread table names/
    );
  });
});
