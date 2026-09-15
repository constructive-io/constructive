import { runLogNames } from '../src/names';
import { isMissingRunSurface } from '../src/surface';

const names = runLogNames();

describe('isMissingRunSurface', () => {
  it('recognises the missing run collection', () => {
    expect(
      isMissingRunSurface(
        new Error(
          'run log request failed: Cannot query field "agentRuns" on type "Query".'
        ),
        names
      )
    ).toBe(true);
  });

  it('recognises the missing filter type', () => {
    expect(
      isMissingRunSurface(
        new Error('run log request failed: Unknown type "AgentRunFilter".'),
        names
      )
    ).toBe(true);
  });

  it('uses the configured names, not the defaults', () => {
    const org = runLogNames('org_agent_run', 'org_agent_event');
    expect(
      isMissingRunSurface(
        new Error('Cannot query field "orgAgentRuns" on type "Query".'),
        org
      )
    ).toBe(true);
    expect(
      isMissingRunSurface(
        new Error('Cannot query field "agentRuns" on type "Query".'),
        org
      )
    ).toBe(false);
  });

  it('does not classify a transport or permission failure as a missing surface', () => {
    expect(
      isMissingRunSurface(new Error('permission denied for table agent_run'), names)
    ).toBe(false);
    expect(isMissingRunSurface('fetch failed', names)).toBe(false);
  });
});
